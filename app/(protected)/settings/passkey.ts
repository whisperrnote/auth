import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { masterPassCrypto } from '@/app/(protected)/masterpass/logic';
import { AppwriteService } from '@/lib/appwrite';
import toast from 'react-hot-toast';

// Helper to convert ArrayBuffer to Base64 string
function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

// Helper to convert Base64 string to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
}

export async function enablePasskey(userId: string) {
    if (!masterPassCrypto.isVaultUnlocked()) {
        toast.error('You must unlock your vault with your master password first.');
        return false;
    }

    try {
        const toastId = toast.loading('Waiting for passkey interaction...');

        // 1. Generate Kwrap on the client
        const kwrap = await crypto.subtle.generateKey(
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt', 'decrypt']
        );
        const rawKwrap = await crypto.subtle.exportKey('raw', kwrap);

        // 2. Encrypt master key with Kwrap to create the passkeyBlob
        const rawMasterKey = await masterPassCrypto.exportKey();
        if (!rawMasterKey) throw new Error('Could not export master key.');

        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encryptedMasterKey = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            kwrap,
            rawMasterKey
        );

        const combined = new Uint8Array(iv.length + encryptedMasterKey.byteLength);
        combined.set(iv);
        combined.set(new Uint8Array(encryptedMasterKey), iv.length);
        const passkeyBlob = arrayBufferToBase64(combined.buffer);

        // 3. Get registration challenge from the server
        const resChallenge = await fetch('/api/passkey/register-challenge', { method: 'GET', credentials: 'include' });
        const options = await resChallenge.json();
        if (!resChallenge.ok) throw new Error(options.error);

        // Add the largeBlob extension to the options to store Kwrap
        // Note: largeBlob extension support varies by browser and authenticator
        // options.extensions = { largeBlob: { write: rawKwrap } };

        // 4. Start WebAuthn registration
        const regResp = await startRegistration(options);

        // 5. Verify the registration response with the server
        const resVerify = await fetch('/api/passkey/register-verify', { credentials: 'include',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(regResp),
        });
        const verification = await resVerify.json();
        if (!resVerify.ok || !verification.verified) {
            throw new Error(verification.error || 'Failed to verify passkey registration.');
        }

        // 6. Store the new credential and the encrypted blob
        const { registrationInfo } = verification;
        const newCredential = {
            credentialID: arrayBufferToBase64(registrationInfo.credentialID),
            publicKey: arrayBufferToBase64(registrationInfo.credentialPublicKey),
            counter: registrationInfo.counter,
            transports: regResp.response.transports || [],
        };

        await AppwriteService.setPasskey(userId, passkeyBlob, newCredential);

        toast.success('Passkey enabled successfully!', { id: toastId });
        return true;

    } catch (error: any) {
        console.error(error);
        const message = error.name === 'InvalidStateError'
            ? 'This passkey is already registered.'
            : error.message;
        toast.error(`Failed to enable passkey: ${message}`);
        return false;
    }
}

export async function disablePasskey(userId: string) {
    try {
        await AppwriteService.removePasskey(userId);
        toast.success('Passkey disabled successfully.');
        return true;
    } catch (error: any) {
        console.error(error);
        toast.error(`Failed to disable passkey: ${error.message}`);
        return false;
    }
}

export async function unlockWithPasskey(userId: string): Promise<boolean> {
    try {
        const toastId = toast.loading('Waiting for passkey interaction...');

        // 1. Get login challenge
        const resChallenge = await fetch('/api/passkey/login-challenge', { credentials: 'include' });
        const options = await resChallenge.json();
        if (!resChallenge.ok) throw new Error(options.error);

        // 2. Start authentication
        const authResp = await startAuthentication(options);

        // 3. Verify authentication
        const resVerify = await fetch('/api/passkey/login-verify', { credentials: 'include',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(authResp),
        });
        const verification = await resVerify.json();
        if (!verification.verified) {
            throw new Error(verification.error || 'Passkey verification failed.');
        }

        // 4. Get Kwrap from the largeBlob extension output
        // Note: largeBlob extension support varies by browser and authenticator
        // const kwrapBytes = authResp.response.largeBlob;
        const kwrapBytes = null; // Temporary - largeBlob not available
        if (!kwrapBytes) {
            throw new Error('Could not retrieve wrapping key from passkey - largeBlob extension not supported.');
        }
        const kwrap = await crypto.subtle.importKey(
            'raw',
            kwrapBytes,
            { name: 'AES-GCM' },
            true,
            ['decrypt']
        );

        // 5. Get passkeyBlob from user document
        const userDoc = await AppwriteService.getUserDoc(userId);
        if (!userDoc || !userDoc.passkeyBlob) {
            throw new Error('No passkey data found for this user.');
        }
        const passkeyBlob = base64ToArrayBuffer(userDoc.passkeyBlob);

        // 6. Decrypt master key
        const iv = passkeyBlob.slice(0, 12);
        const encryptedKey = passkeyBlob.slice(12);
        const rawMasterKey = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            kwrap,
            encryptedKey
        );

        // 7. Import master key and unlock vault
        await masterPassCrypto.importKey(rawMasterKey);
        await masterPassCrypto.unlockWithImportedKey();

        toast.success('Vault unlocked with passkey!', { id: toastId });
        return true;
    } catch (error: any) {
        console.error(error);
        toast.error(`Passkey unlock failed: ${error.message}`);
        return false;
    }
}
