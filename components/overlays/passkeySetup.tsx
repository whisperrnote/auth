"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { enablePasskey, disablePasskey } from "@/app/(protected)/settings/passkey";
import { masterPassCrypto } from "@/app/(protected)/masterpass/logic";
import toast from "react-hot-toast";

interface PasskeySetupProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  isEnabled: boolean;
  onSuccess: () => void;
}

export function PasskeySetup({ isOpen, onClose, userId, isEnabled, onSuccess }: PasskeySetupProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleEnable = async () => {
    // Check if vault is unlocked
    if (!masterPassCrypto.isVaultUnlocked()) {
      toast.error('Your vault must be unlocked with your master password first.');
      onClose();
      return;
    }

    setLoading(true);
    const success = await enablePasskey(userId);
    setLoading(false);

    if (success) {
      setStep(3); // Success step
      onSuccess();
    }
  };

  const handleDisable = async () => {
    setLoading(true);
    const success = await disablePasskey(userId);
    setLoading(false);

    if (success) {
      onSuccess();
      onClose();
    }
  };

  const resetDialog = () => {
    setStep(1);
    setLoading(false);
  };

  const handleClose = () => {
    resetDialog();
    onClose();
  };

  if (isEnabled) {
    // Disable passkey flow
    return (
      <Dialog open={isOpen} onClose={handleClose}>
        <div className="p-6 w-96">
          <h2 className="text-lg font-semibold mb-4">Disable Passkey</h2>
          <div className="space-y-4">
            <p className="text-gray-600">
              Are you sure you want to disable passkey authentication? You'll need to use your master password to unlock your vault.
            </p>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={handleClose} disabled={loading}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDisable}
                disabled={loading}
              >
                {loading ? "Disabling..." : "Disable Passkey"}
              </Button>
            </div>
          </div>
        </div>
      </Dialog>
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
                <h3 className="font-medium">Step 1: Prerequisites</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>✓ You are logged in to your account</p>
                  <p>✓ Your vault is unlocked with your master password</p>
                  <p>✓ Your device supports passkeys (Face ID, Touch ID, Windows Hello, etc.)</p>
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>What happens next:</strong> We'll create a secure passkey that can unlock your vault without requiring your master password. Your master password will still work as a backup.
                </p>
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button onClick={() => setStep(2)}>
                  Continue
                </Button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-3">
                <h3 className="font-medium">Step 2: Create Passkey</h3>
                <p className="text-sm text-gray-600">
                  Click "Create Passkey" and follow your device's prompts to create a new passkey. This might involve:
                </p>
                <ul className="text-sm text-gray-600 space-y-1 ml-4">
                  <li>• Face ID or Touch ID verification</li>
                  <li>• Windows Hello authentication</li>
                  <li>• Security key insertion</li>
                  <li>• Device PIN entry</li>
                </ul>
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setStep(1)} disabled={loading}>
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
                <h3 className="font-medium text-green-700">✓ Passkey Enabled Successfully!</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>Your passkey has been created and linked to your vault.</p>
                  <p><strong>Next time you log in:</strong> You can choose to unlock your vault with either your master password or your passkey.</p>
                  <p><strong>Security note:</strong> Your master password will always work as a backup method.</p>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <Button onClick={handleClose} className="w-full">
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