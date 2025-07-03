import { useState } from "react";
import Dialog from "../ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { appwriteAccount } from "@/lib/appwrite";

export default function TwofaSetup({ open, onClose, user, onStatusChange }: {
  open: boolean;
  onClose: () => void;
  user: any;
  onStatusChange: (enabled: boolean) => void;
}) {
  const [step, setStep] = useState<"init" | "qr" | "verify" | "done" | "disable">("init");
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);

  // Start TOTP setup (add authenticator, show QR)
  const handleStart = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Add authenticator (TOTP) as a factor
      // This is the correct Appwrite flow: createMfaAuthenticator returns secret and QR
      const totp = await appwriteAccount.createMfaAuthenticator("authenticator");
      setSecret(totp.secret);
      setQrUrl(totp.qrUrl);
      setStep("qr");
    } catch (e: any) {
      setError(e.message || "Failed to start 2FA setup.");
    }
    setLoading(false);
  };

  // Initiate TOTP challenge (after user scans QR and wants to verify)
  const handleInitiateChallenge = async () => {
    setLoading(true);
    setError(null);
    try {
      // 2. Create a challenge for the authenticator factor
      const challenge = await appwriteAccount.createMfaChallenge("authenticator");
      setChallengeId(challenge.$id);
      setStep("verify");
    } catch (e: any) {
      setError(e.message || "Failed to initiate verification.");
    }
    setLoading(false);
  };

  // Complete TOTP challenge (user enters OTP from app)
  const handleVerify = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!challengeId) {
        setError("No challenge in progress.");
        setLoading(false);
        return;
      }
      // 3. Complete the challenge with the OTP
      await appwriteAccount.updateMfaChallenge(challengeId, otp);

      // 4. Enable MFA on the account (enforce MFA)
      await appwriteAccount.updateMFA(true);

      onStatusChange(true);

      // 5. Get recovery codes
      const codes = await appwriteAccount.createMfaRecoveryCodes();
      setRecoveryCodes(codes.recoveryCodes);
      setStep("done");
    } catch (e: any) {
      setError(e.message || "Invalid code.");
    }
    setLoading(false);
  };

  // Disable 2FA (remove authenticator and disable MFA enforcement)
  const handleDisable = async () => {
    setLoading(true);
    setError(null);
    try {
      // Remove authenticator factor
      await appwriteAccount.deleteMfaAuthenticator();
      // Disable MFA enforcement
      await appwriteAccount.updateMFA(false);
      onStatusChange(false);
      setStep("init");
    } catch (e: any) {
      setError(e.message || "Failed to disable 2FA.");
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <div className="p-6 max-w-md w-full bg-white rounded-lg shadow-lg">
        <h2 className="text-xl font-bold mb-2">Two-Factor Authentication</h2>
        {step === "init" && (
          <>
            <p className="mb-4">Add an extra layer of security to your account.</p>
            <Button onClick={handleStart} loading={loading}>
              Enable Two-Factor Authentication
            </Button>
            {user?.twofa && (
              <Button variant="destructive" className="mt-4" onClick={handleDisable} loading={loading}>
                Disable Two-Factor Authentication
              </Button>
            )}
          </>
        )}
        {step === "qr" && (
          <>
            <p className="mb-2">Scan this QR code with your authenticator app:</p>
            {qrUrl && <img src={qrUrl} alt="TOTP QR" className="mx-auto mb-4" />}
            <Button onClick={handleInitiateChallenge} loading={loading}>
              Next: Enter Code From App
            </Button>
          </>
        )}
        {step === "verify" && (
          <>
            <p className="mb-2">Enter the 6-digit code from your authenticator app:</p>
            <Input
              placeholder="Enter code"
              value={otp}
              onChange={e => setOtp(e.target.value)}
              className="mb-2"
            />
            <Button onClick={handleVerify} loading={loading}>
              Verify & Enable
            </Button>
          </>
        )}
        {step === "done" && (
          <>
            <p className="mb-2">Two-Factor Authentication enabled!</p>
            {recoveryCodes && (
              <div className="mb-2">
                <p className="font-semibold">Recovery Codes:</p>
                <ul className="text-xs bg-gray-100 p-2 rounded">
                  {recoveryCodes.map(code => <li key={code}>{code}</li>)}
                </ul>
                <p className="text-xs mt-1">Save these codes in a secure place.</p>
              </div>
            )}
            <Button onClick={onClose}>Done</Button>
          </>
        )}
        {error && <div className="text-red-600 mt-2">{error}</div>}
      </div>
    </Dialog>
  );
}
