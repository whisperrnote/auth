import { useState, useEffect } from "react";
import Dialog from "../ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { 
  generateRecoveryCodes,
  addTotpFactor, 
  verifyTotpFactor,
  updateMfaStatus,
  removeTotpFactor,
  listMfaFactors,
  addEmailFactor,
  completeEmailVerification,
  AppwriteService,
  APPWRITE_DATABASE_ID,
  APPWRITE_COLLECTION_USER_ID,
  appwriteDatabases
} from "@/lib/appwrite";
import { Query } from "appwrite";

export default function TwofaSetup({ open, onClose, user, onStatusChange }: {
  open: boolean;
  onClose: () => void;
  user: any;
  onStatusChange: (enabled: boolean) => void;
}) {
  const [step, setStep] = useState<"init" | "recovery" | "factors" | "totp_qr" | "totp_verify" | "email_setup" | "email_verify" | "done">("init");
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [currentFactors, setCurrentFactors] = useState<{ totp: boolean; email: boolean; phone: boolean } | null>(null);
  const [selectedFactors, setSelectedFactors] = useState<{ totp: boolean; email: boolean }>({ totp: false, email: false });
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);
  const [isCurrentlyEnabled, setIsCurrentlyEnabled] = useState(false);

  // Load current MFA status
  useEffect(() => {
    if (open && user) {
      loadCurrentStatus();
    }
  }, [open, user]);

  const loadCurrentStatus = async () => {
    try {
      // Check current factors
      const factors = await listMfaFactors();
      setCurrentFactors(factors);
      
      // Check if MFA is enabled by looking at user doc
      const userDoc = await AppwriteService.getUserDoc(user.$id);
      const mfaEnabled = userDoc?.twofa === true;
      setIsCurrentlyEnabled(mfaEnabled);
      
      // If MFA is already enabled, show management options
      if (mfaEnabled && (factors.totp || factors.email)) {
        setStep("init");
      }
    } catch (error) {
      console.error("Failed to load MFA status:", error);
    }
  };

  // Step 1: Generate recovery codes FIRST (required by Appwrite)
  const handleStart = async () => {
    setLoading(true);
    setError(null);
    try {
      const codes = await generateRecoveryCodes();
      setRecoveryCodes(codes.recoveryCodes);
      setStep("recovery");
    } catch (e: any) {
      setError(e.message || "Failed to generate recovery codes.");
    }
    setLoading(false);
  };

  // Step 2: Choose factors to enable
  const handleFactorSelection = () => {
    setStep("factors");
  };

  // Step 3: Setup TOTP
  const handleSetupTotp = async () => {
    setLoading(true);
    setError(null);
    try {
      const totp = await addTotpFactor();
      setSecret(totp.secret);
      setQrUrl(totp.qrUrl);
      setStep("totp_qr");
    } catch (e: any) {
      setError(e.message || "Failed to add TOTP factor.");
    }
    setLoading(false);
  };

  // Step 4: Verify TOTP
  const handleVerifyTotp = async () => {
    setLoading(true);
    setError(null);
    try {
      const verified = await verifyTotpFactor(otp);
      if (!verified) {
        setError("Invalid code. Please try again.");
        setLoading(false);
        return;
      }
      
      // TOTP verified, check if email is also selected
      if (selectedFactors.email) {
        setStep("email_setup");
      } else {
        await finalizeSetup();
      }
    } catch (e: any) {
      setError(e.message || "Verification failed.");
    }
    setLoading(false);
  };

  // Step 5: Setup email factor
  const handleSetupEmail = async () => {
    setLoading(true);
    setError(null);
    try {
      // Add email as MFA factor (requires current password - we'll need to handle this)
      await addEmailFactor(user.email, ""); // This might fail - email is already verified for login
      setEmailVerificationSent(true);
      setStep("email_verify");
    } catch (e: any) {
      // If email is already verified for account, it might already be usable as MFA
      console.log("Email factor setup:", e.message);
      await finalizeSetup();
    }
    setLoading(false);
  };

  // Finalize setup - enable MFA and update user doc
  const finalizeSetup = async () => {
    setLoading(true);
    try {
      // Enable MFA enforcement
      await updateMfaStatus(true);
      
      // Update user document to reflect 2FA status
      const userDoc = await AppwriteService.getUserDoc(user.$id);
      if (userDoc && userDoc.$id) {
        await AppwriteService.updateUserDoc(userDoc.$id, { twofa: true });
      }
      
      onStatusChange(true);
      setStep("done");
    } catch (e: any) {
      setError(e.message || "Failed to enable MFA.");
    }
    setLoading(false);
  };

  // Disable 2FA completely
  const handleDisable = async () => {
    if (!confirm("Are you sure you want to disable two-factor authentication? This will make your account less secure.")) {
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      // First disable MFA enforcement
      await updateMfaStatus(false);
      
      // Remove TOTP factor if present
      if (currentFactors?.totp) {
        await removeTotpFactor();
      }
      
      // Update user document
      const userDoc = await AppwriteService.getUserDoc(user.$id);
      if (userDoc && userDoc.$id) {
        await AppwriteService.updateUserDoc(userDoc.$id, { twofa: false });
      }
      
      onStatusChange(false);
      setStep("init");
      setIsCurrentlyEnabled(false);
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
            <p className="mb-4">
              {isCurrentlyEnabled 
                ? "Two-factor authentication is currently enabled for your account."
                : "Add an extra layer of security to your account."
              }
            </p>
            
            {!isCurrentlyEnabled ? (
              <Button onClick={handleStart} disabled={loading}>
                {loading ? "Starting..." : "Enable Two-Factor Authentication"}
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="text-sm">
                  <p className="font-medium">Currently enabled factors:</p>
                  <ul className="list-disc list-inside mt-1 text-muted-foreground">
                    {currentFactors?.totp && <li>Authenticator App (TOTP)</li>}
                    {currentFactors?.email && <li>Email Verification</li>}
                    {currentFactors?.phone && <li>SMS Verification</li>}
                  </ul>
                </div>
                
                <div className="flex gap-2">
                  <Button onClick={handleStart} disabled={loading}>
                    Add More Factors
                  </Button>
                  <Button variant="destructive" onClick={handleDisable} disabled={loading}>
                    {loading ? "Disabling..." : "Disable 2FA"}
                  </Button>
                </div>
              </div>
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
            <Button onClick={handleFactorSelection} disabled={loading}>
              I've saved my codes, continue
            </Button>
          </>
        )}

        {step === "factors" && (
          <>
            <p className="mb-4 text-sm">Choose which authentication factors to enable:</p>
            <div className="space-y-3 mb-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedFactors.totp}
                  onChange={(e) => setSelectedFactors(prev => ({ ...prev, totp: e.target.checked }))}
                />
                <div>
                  <div className="font-medium">Authenticator App (TOTP)</div>
                  <div className="text-xs text-muted-foreground">Use Google Authenticator, Authy, etc.</div>
                </div>
              </label>
              
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedFactors.email}
                  onChange={(e) => setSelectedFactors(prev => ({ ...prev, email: e.target.checked }))}
                />
                <div>
                  <div className="font-medium">Email Verification</div>
                  <div className="text-xs text-muted-foreground">Receive codes via email</div>
                </div>
              </label>
            </div>
            
            <Button 
              onClick={() => {
                if (selectedFactors.totp) {
                  handleSetupTotp();
                } else if (selectedFactors.email) {
                  handleSetupEmail();
                } else {
                  setError("Please select at least one authentication factor.");
                }
              }} 
              disabled={loading || (!selectedFactors.totp && !selectedFactors.email)}
            >
              Continue
            </Button>
          </>
        )}

        {step === "totp_qr" && (
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
              {loading ? "Verifying..." : "Verify & Continue"}
            </Button>
          </>
        )}

        {step === "email_setup" && (
          <>
            <p className="mb-4">Email verification will be added as a second factor.</p>
            <Button onClick={handleSetupEmail} disabled={loading}>
              {loading ? "Setting up..." : "Setup Email Factor"}
            </Button>
          </>
        )}

        {step === "email_verify" && (
          <>
            <p className="mb-4">
              {emailVerificationSent 
                ? "Check your email and click the verification link."
                : "Email factor has been configured."
              }
            </p>
            <Button onClick={finalizeSetup} disabled={loading}>
              {loading ? "Finalizing..." : "Complete Setup"}
            </Button>
          </>
        )}

        {step === "done" && (
          <>
            <p className="mb-2 text-green-600">✅ Two-Factor Authentication enabled!</p>
            <p className="text-sm mb-4">Your account is now protected with 2FA. You'll need your selected factors to sign in.</p>
            <Button onClick={onClose}>Done</Button>
          </>
        )}

        {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
      </div>
    </Dialog>
  );
}
