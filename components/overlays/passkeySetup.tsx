"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { startRegistration } from "@simplewebauthn/browser";
import { AppwriteService } from "@/lib/appwrite";
import toast from "react-hot-toast";
import { Eye, EyeOff } from "lucide-react";
import MasterPasswordVerificationDialog from "./MasterPasswordVerificationDialog";

interface PasskeySetupProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  isEnabled: boolean;
  onSuccess: () => void;
}

// Helper to convert ArrayBuffer to Base64 string
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export function PasskeySetup({
  isOpen,
  onClose,
  userId,
  isEnabled,
  onSuccess,
}: PasskeySetupProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [masterPassword, setMasterPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [verifyingPassword, setVerifyingPassword] = useState(false);
  const [isVerificationOpen, setIsVerificationOpen] = useState(false);

  const verifyMasterPassword = async () => {
    if (!masterPassword.trim()) {
      toast.error("Please enter your master password.");
      return false;
    }

    setVerifyingPassword(true);
    try {
      // Derive test key using same logic as masterPassCrypto.unlock
      const encoder = new TextEncoder();
      const userBytes = encoder.encode(userId);
      const userSalt = await crypto.subtle.digest("SHA-256", userBytes);
      const combinedSalt = new Uint8Array(userSalt);

      const keyMaterial = await crypto.subtle.importKey(
        "raw",
        encoder.encode(masterPassword),
        { name: "PBKDF2" },
        false,
        ["deriveBits", "deriveKey"],
      );

      const testKey = await crypto.subtle.deriveKey(
        {
          name: "PBKDF2",
          salt: combinedSalt,
          iterations: 200000,
          hash: "SHA-256",
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"],
      );

      // Verify against check value stored in database
      const {
        appwriteDatabases,
        APPWRITE_DATABASE_ID,
        APPWRITE_COLLECTION_USER_ID,
        Query,
      } = await import("@/lib/appwrite");
      const response = await appwriteDatabases.listDocuments(
        APPWRITE_DATABASE_ID,
        APPWRITE_COLLECTION_USER_ID,
        [Query.equal("userId", userId)],
      );

      const userDoc = response.documents[0];
      if (!userDoc || !userDoc.check) {
        toast.error("No master password verification data found.");
        return false;
      }

      // Decrypt and verify the check value
      try {
        const combined = new Uint8Array(
          atob(userDoc.check)
            .split("")
            .map((char) => char.charCodeAt(0)),
        );
        const iv = combined.slice(0, 16); // IV_SIZE from logic.ts
        const encrypted = combined.slice(16);
        const decrypted = await crypto.subtle.decrypt(
          { name: "AES-GCM", iv },
          testKey,
          encrypted,
        );
        const decoder = new TextDecoder();
        const decryptedValue = JSON.parse(decoder.decode(decrypted));

        if (decryptedValue === userId) {
          return true; // Password is correct
        } else {
          toast.error("Incorrect master password.");
          return false;
        }
      } catch (decryptError) {
        toast.error("Incorrect master password.");
        return false;
      }
    } catch (error) {
      console.error("Password verification failed:", error);
      toast.error("Failed to verify master password.");
      return false;
    } finally {
      setVerifyingPassword(false);
    }
  };

  const handleContinue = async () => {
    const isValid = await verifyMasterPassword();
    if (isValid) {
      setStep(2);
    }
  };

  const handleEnable = async () => {
    if (!masterPassword.trim()) {
      toast.error("Please enter your master password.");
      return;
    }

    setLoading(true);
    try {
      // 1. Derive master key from password (same logic as masterPassCrypto.unlock)
      const encoder = new TextEncoder();
      const userBytes = encoder.encode(userId);
      const userSalt = await crypto.subtle.digest("SHA-256", userBytes);
      const combinedSalt = new Uint8Array(userSalt);

      const keyMaterial = await crypto.subtle.importKey(
        "raw",
        encoder.encode(masterPassword),
        { name: "PBKDF2" },
        false,
        ["deriveBits", "deriveKey"],
      );

      const masterKey = await crypto.subtle.deriveKey(
        {
          name: "PBKDF2",
          salt: combinedSalt,
          iterations: 200000,
          hash: "SHA-256",
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"],
      );

      // 2. Generate WebAuthn registration first to get credential data
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const challengeBase64 = arrayBufferToBase64(challenge.buffer);

      const userIdBytes = new TextEncoder().encode(userId);
      const registrationOptions = {
        challenge: challengeBase64,
        rp: {
          name: "WhisperAuth",
          id: window.location.hostname,
        },
        user: {
          id: arrayBufferToBase64(userIdBytes.buffer as ArrayBuffer),
          name: userId,
          displayName: userId,
        },
        pubKeyCredParams: [{ alg: -7, type: "public-key" as const }],
        authenticatorSelection: {
          authenticatorAttachment: "platform" as const,
          residentKey: "required" as const,
          userVerification: "preferred" as const,
        },
        timeout: 60000,
        attestation: "none" as const,
      };

      // 3. Start WebAuthn registration
      const regResp = await startRegistration(registrationOptions);

      // 4. Derive Kwrap from WebAuthn credential data
      // Use credential ID + user ID to deterministically generate Kwrap
      const credentialData = encoder.encode(regResp.id + userId);
      const kwrapSeed = await crypto.subtle.digest("SHA-256", credentialData);
      const kwrap = await crypto.subtle.importKey(
        "raw",
        kwrapSeed,
        { name: "AES-GCM" },
        false,
        ["encrypt", "decrypt"],
      );

      // 5. Export master key and encrypt it with Kwrap
      const rawMasterKey = await crypto.subtle.exportKey("raw", masterKey);
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encryptedMasterKey = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        kwrap,
        rawMasterKey,
      );

      // 6. Combine IV + encrypted key for passkeyBlob
      const combined = new Uint8Array(
        iv.length + encryptedMasterKey.byteLength,
      );
      combined.set(iv);
      combined.set(new Uint8Array(encryptedMasterKey), iv.length);
      const passkeyBlob = arrayBufferToBase64(combined.buffer);

      // 7. Store credential and encrypted blob (no separate kwrap field needed)
      const newCredential = {
        credentialID: regResp.id,
        publicKey: regResp.response.publicKey || "",
        counter: 0,
        transports: regResp.response.transports || [],
      };

      // Store in database
      await AppwriteService.setPasskey(userId, passkeyBlob, newCredential);

      setStep(3); // Success step
    } catch (error: unknown) {
      console.error("Passkey setup failed:", error);
      const err = error as { name?: string; message?: string };
      const message =
        err.name === "InvalidStateError"
          ? "This passkey is already registered."
          : err.message;
      toast.error(`Failed to create passkey: ${message}`);
    }
    setLoading(false);
  };

  const handleDisable = async () => {
    setLoading(true);
    try {
      await AppwriteService.removePasskey(userId);
      toast.success("Passkey disabled successfully.");
      onSuccess();
      onClose();
    } catch (error: unknown) {
      console.error(error);
      const err = error as { message?: string };
      toast.error(
        `Failed to disable passkey: ${err.message || "Unknown error"}`,
      );
    }
    setLoading(false);
  };

  const resetDialog = () => {
    setStep(1);
    setLoading(false);
    setMasterPassword("");
    setShowPassword(false);
  };

  const handleClose = () => {
    resetDialog();
    onClose();
  };

  if (isEnabled) {
    // Disable passkey flow
    return (
      <>
        <Dialog open={isOpen && !isVerificationOpen} onClose={handleClose}>
          <div className="p-6 w-96">
            <h2 className="text-lg font-semibold mb-4">Disable Passkey</h2>
            <div className="space-y-4">
              <p className="text-gray-600">
                Are you sure you want to disable passkey authentication?
                You&apos;ll need to use your master password to unlock your
                vault.
              </p>
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setIsVerificationOpen(true)}
                  disabled={loading}
                >
                  {loading ? "Disabling..." : "Disable Passkey"}
                </Button>
              </div>
            </div>
          </div>
        </Dialog>
        {isVerificationOpen && (
          <MasterPasswordVerificationDialog
            open={isVerificationOpen}
            onClose={() => setIsVerificationOpen(false)}
            onSuccess={() => {
              setIsVerificationOpen(false);
              handleDisable();
            }}
          />
        )}
      </>
    );
  }

  // Enable passkey flow
  return (
    <Dialog open={isOpen} onClose={handleClose}>
      <div className="p-6 w-96">
        <h2 className="text-lg font-semibold mb-4">Set Up Passkey</h2>
        <div className="space-y-4">
          {step === 1 && (
            <>
              <div className="space-y-3">
                <h3 className="font-medium">Step 1: Enter Master Password</h3>
                <p className="text-sm text-gray-600">
                  Enter your master password to create a passkey. This will
                  encrypt your vault keys with the passkey.
                </p>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Master Password"
                    value={masterPassword}
                    onChange={(e) => setMasterPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleContinue()}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleContinue}
                  disabled={!masterPassword.trim() || verifyingPassword}
                >
                  {verifyingPassword ? "Verifying..." : "Continue"}
                </Button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-3">
                <h3 className="font-medium">Step 2: Create Passkey</h3>
                <p className="text-sm text-gray-600">
                  Click &quot;Create Passkey&quot; and follow your device&apos;s
                  prompts to create a new passkey. This might involve:
                </p>
                <ul className="text-sm text-gray-600 space-y-1 ml-4">
                  <li>• Face ID or Touch ID verification</li>
                  <li>• Windows Hello authentication</li>
                  <li>• Security key insertion</li>
                  <li>• Device PIN entry</li>
                </ul>
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  disabled={loading}
                >
                  Back
                </Button>
                <Button onClick={handleEnable} disabled={loading}>
                  {loading ? "Creating Passkey..." : "Create Passkey"}
                </Button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="space-y-3">
                <h3 className="font-medium text-green-700">
                  ✓ Passkey Enabled Successfully!
                </h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>Your passkey has been created and linked to your vault.</p>
                  <p>
                    <strong>Next time you log in:</strong> You can choose to
                    unlock your vault with either your master password or your
                    passkey.
                  </p>
                  <p>
                    <strong>Security note:</strong> Your master password will
                    always work as a backup method.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => {
                    onSuccess();
                    handleClose();
                  }}
                  className="w-full"
                >
                  Done
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </Dialog>
  );
}
