import { useState } from "react";
import Dialog from "../ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { 
  generateRecoveryCodes,
  addTotpFactor, 
  verifyTotpFactor,
  updateMfaStatus,
  removeTotpFactor,
  listMfaFactors
} from "@/lib/appwrite";

export default function TwofaSetup({ open, onClose, user, onStatusChange }: {
  open: boolean;
  onClose: () => void;
  user: any;
  onStatusChange: (enabled: boolean) => void;
}) {
  const [step, setStep] = useState<"init" | "recovery" | "qr" | "verify" | "done">("init");
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);

  // Step 1: Generate recovery codes FIRST
  const handleStart = async () => {
    setLoading(true);
    setError(null);
    try {
      // Generate recovery codes before enabling MFA (required by Appwrite)
      const codes = await generateRecoveryCodes();
      setRecoveryCodes(codes.recoveryCodes);
      setStep("recovery");
    } catch (e: any) {
      setError(e.message || "Failed to generate recovery codes.");
    }
    setLoading(false);
  };

  // Step 2: Add TOTP factor after user saves recovery codes
  const handleAddTotp = async () => {
    setLoading(true);
    setError(null);
    try {
      // Add TOTP authenticator factor
      const totp = await addTotpFactor();
      setSecret(totp.secret);
      setQrUrl(totp.qrUrl);
      setStep("qr");
    } catch (e: any) {
      setError(e.message || "Failed to add TOTP factor.");
    }
    setLoading(false);
  };

  // Step 3: Verify TOTP factor works
  const handleVerifyTotp = async () => {
    setLoading(true);
    setError(null);
    try {
      // Verify the TOTP factor by completing a challenge
      const verified = await verifyTotpFactor(otp);
      if (!verified) {
        setError("Invalid code. Please try again.");
        setLoading(false);
        return;
      }

      // Step 4: Enable MFA enforcement
      await updateMfaStatus(true);
      onStatusChange(true);
      setStep("done");
    } catch (e: any) {
      setError(e.message || "Verification failed.");
    }
    setLoading(false);
  };

  // Disable 2FA completely
  const handleDisable = async () => {
    setLoading(true);
    setError(null);
    try {
      // First disable MFA enforcement
      await updateMfaStatus(false);
      // Then remove TOTP factor
      await removeTotpFactor();
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
            <Button onClick={handleStart} disabled={loading}>
              {loading ? "Starting..." : "Enable Two-Factor Authentication"}
            </Button>
            {user?.twofa && (
              <Button variant="destructive" className="mt-4" onClick={handleDisable} disabled={loading}>
                {loading ? "Disabling..." : "Disable Two-Factor Authentication"}
              </Button>
            )}
          </>
        )}

        {step === "recovery" && (
          <>
            <p className="mb-2 font-semibold text-red-600">Save your recovery codes!</p>
            <p className="mb-2 text-sm">These codes can be used to access your account if you lose your authenticator:</p>
            {recoveryCodes && (
              <div className="mb-4">
                <ul className="text-xs bg-gray-100 p-2 rounded font-mono">
                  {recoveryCodes.map(code => <li key={code}>{code}</li>)}
                </ul>
              </div>
            )}
            <p className="text-xs text-muted-foreground mb-4">Save these codes in a secure place. They will not be shown again.</p>
            <Button onClick={handleAddTotp} disabled={loading}>
              {loading ? "Setting up..." : "I've saved my codes, continue"}
            </Button>
          </>
        )}

        {step === "qr" && (
          <>
            <p className="mb-2">Scan this QR code with your authenticator app:</p>
            {qrUrl && <img src={qrUrl} alt="TOTP QR" className="mx-auto mb-4" />}
            <p className="text-xs mb-4">Or enter this secret manually: <code className="bg-gray-100 px-1">{secret}</code></p>
            <Input
              placeholder="Enter 6-digit code from app"
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="mb-2"
              maxLength={6}
            />
            <Button onClick={handleVerifyTotp} disabled={loading || otp.length !== 6}>
              {loading ? "Verifying..." : "Verify & Enable"}
            </Button>
          </>
        )}

        {step === "done" && (
          <>
            <p className="mb-2 text-green-600">✅ Two-Factor Authentication enabled!</p>
            <p className="text-sm mb-4">Your account is now protected with 2FA. You'll need your authenticator app to sign in.</p>
            <Button onClick={onClose}>Done</Button>
          </>
        )}

        {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
      </div>
    </Dialog>
  );
}
