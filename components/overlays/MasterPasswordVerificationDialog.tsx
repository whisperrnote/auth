"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { masterPassCrypto } from "@/app/(protected)/masterpass/logic";
import { useAppwrite } from "@/app/appwrite-provider";
import toast from "react-hot-toast";

interface MasterPasswordVerificationDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function MasterPasswordVerificationDialog({
  open,
  onClose,
  onSuccess,
}: MasterPasswordVerificationDialogProps) {
  const { user } = useAppwrite();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleVerify = async () => {
    if (!user?.$id) {
      setError("User not found.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const encoder = new TextEncoder();
      const userBytes = encoder.encode(user.$id);
      const userSalt = await crypto.subtle.digest("SHA-256", userBytes);
      const combinedSalt = new Uint8Array(userSalt);

      const keyMaterial = await crypto.subtle.importKey(
        "raw",
        encoder.encode(password),
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

      const isValid = await masterPassCrypto.verifyMasterpassCheck(testKey, user.$id);

      if (isValid) {
        toast.success("Master password verified.");
        await onSuccess();
        onClose();
      } else {
        setError("Incorrect master password.");
      }
    } catch (e) {
      setError("An error occurred during verification.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <div className="p-6">
        <h3 className="text-lg font-bold">Master Password Verification</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          For your security, please enter your master password to continue.
        </p>
        <div className="mt-4">
          <Input
            type="password"
            placeholder="Enter your master password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleVerify()}
          />
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleVerify} disabled={loading}>
            {loading ? "Verifying..." : "Verify"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
