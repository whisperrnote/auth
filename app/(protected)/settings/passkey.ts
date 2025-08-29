import { startAuthentication } from '@simplewebauthn/browser';
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

export async function unlockWithPasskey(userId: string): Promise<boolean> {
    try {
        const toastId = toast.loading('Waiting for passkey interaction...');

        // 1. Get user document with passkey data
        const userDoc = await AppwriteService.getUserDoc(userId);
        if (!userDoc || !userDoc.passkeyBlob || !userDoc.credentialId) {
            throw new Error('No passkey data found for this user.');
        }

        // 2. Generate authentication challenge (client-side)
        const challenge = crypto.getRandomValues(new Uint8Array(32));
        const challengeBase64 = arrayBufferToBase64(challenge.buffer);
        
        const authenticationOptions = {
            challenge: challengeBase64,
            allowCredentials: [{
                id: userDoc.credentialId,
                type: 'public-key' as const,
                transports: [] as AuthenticatorTransport[],
            }],
            userVerification: 'preferred' as const,
            timeout: 60000,
        };

        // 3. Start authentication
        const authResp = await startAuthentication(authenticationOptions);

        // 4. Derive Kwrap from WebAuthn credential data (same as setup)
        const encoder = new TextEncoder();
        const credentialData = encoder.encode(authResp.id + userId);
        const kwrapSeed = await crypto.subtle.digest('SHA-256', credentialData);
        const kwrap = await crypto.subtle.importKey(
            'raw',
            kwrapSeed,
            { name: 'AES-GCM' },
            false,
            ['decrypt']
        );

        // 5. Decrypt master key from passkeyBlob
        const passkeyBlob = base64ToArrayBuffer(userDoc.passkeyBlob);
        const iv = passkeyBlob.slice(0, 12);
        const encryptedKey = passkeyBlob.slice(12);
        const rawMasterKey = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            kwrap,
            encryptedKey
        );

        // 6. Import master key and unlock vault
        await masterPassCrypto.importKey(rawMasterKey);
        await masterPassCrypto.unlockWithImportedKey();

        toast.success('Vault unlocked with passkey!', { id: toastId });
        return true;
    } catch (error: unknown) {
        console.error(error);
        const err = error as { message?: string };
        toast.error(`Passkey unlock failed: ${err.message || 'Unknown error'}`);
        return false;
    }
}

export async function disablePasskey(userId: string) {
    try {
        await AppwriteService.removePasskey(userId);
        toast.success('Passkey disabled successfully.');
        return true;
    } catch (error: unknown) {
        console.error(error);
        const err = error as { message?: string };
        toast.error(`Failed to disable passkey: ${err.message || 'Unknown error'}`);
        return false;
    }
}
