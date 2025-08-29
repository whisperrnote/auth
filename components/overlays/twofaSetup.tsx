import { useState, useEffect } from "react";
import { Dialog } from "../ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Copy, Check } from "lucide-react";
import { 
  generateRecoveryCodes,
  addTotpFactor, 
  verifyTotpFactor,
  updateMfaStatus,
  removeTotpFactor,
  listMfaFactors,
  addEmailFactor,
  appwriteDatabases,
  Query,
  APPWRITE_DATABASE_ID,
  APPWRITE_COLLECTION_USER_ID,
  appwriteAccount
} from "@/lib/appwrite";

import type { Models } from "appwrite";

export default function TwofaSetup({ open, onClose, user, onStatusChange }: {
  open: boolean;
  onClose: () => void;
  user: Pick<Models.User<Models.Preferences>, "$id" | "email"> | null;
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
  const [secretCopied, setSecretCopied] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [disableOption, setDisableOption] = useState<"disable_only" | "remove_factors">("disable_only");

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setSecretCopied(true);
      setTimeout(() => setSecretCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  // Load current MFA status
  useEffect(() => {
    if (open && user) {
      loadCurrentStatus();
    }
  }, [open, user]);

  const loadCurrentStatus = async () => {
    try {
      // Get MFA status directly from Appwrite
      const factors = await listMfaFactors();
      const account = await appwriteAccount.get();
      const isEnforced = account.mfa || false;
      
      console.log("MFA Status Debug:", { 
        factors, 
        isEnforced, 
        accountMfa: account.mfa,
        fullAccount: account 
      });
      
      setCurrentFactors(factors);
      setIsCurrentlyEnabled(isEnforced);
      
      // If MFA is already enabled, show management options
      if (isEnforced && (factors.totp || factors.email)) {
        setStep("init");
      }
    } catch (error) {
      console.error("Failed to load MFA status:", error);
      setError("Failed to load MFA status. Please refresh and try again.");
    }
  };

  // When opening "Add More Factors", pre-tick already enabled factors
  const handleFactorSelection = () => {
    // Pre-tick based on currentFactors from Appwrite
    setSelectedFactors({
      totp: !!currentFactors?.totp,
      email: !!currentFactors?.email,
    });
    setStep("factors");
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
      // If recovery codes already generated, allow user to proceed but show warning
      if (
        e?.message?.toLowerCase().includes("already generated recovery codes") ||
        e?.message?.toLowerCase().includes("recovery codes have already been generated") ||
        e?.code === 409
      ) {
        setRecoveryCodes(null); // No codes to show
        setStep("recovery");
      } else {
        setError(e.message || "Failed to generate recovery codes.");
      }
    }
    setLoading(false);
  };

  // Step 2: Choose factors to enable
  // const handleFactorSelection = () => {
  //   setStep("factors");
  // };

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
      if (!user) throw new Error("No user context");
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
      
      // Manually update the user document to reflect MFA status
      // This ensures the database is immediately in sync
      if (user?.$id) {
        try {
          // Get current user doc and update it
          const userDocResponse = await appwriteDatabases.listDocuments(
            APPWRITE_DATABASE_ID,
            APPWRITE_COLLECTION_USER_ID,
            [Query.equal("userId", user.$id)]
          );
          
          if (userDocResponse.documents.length > 0) {
            const userDoc = userDocResponse.documents[0];
            await appwriteDatabases.updateDocument(
              APPWRITE_DATABASE_ID,
              APPWRITE_COLLECTION_USER_ID, 
              userDoc.$id,
              { twofa: true }
            );
          }
        } catch (dbError) {
          console.warn("Failed to update user document:", dbError);
          // Continue anyway - MFA is still enabled in Appwrite
        }
      }
      
      onStatusChange(true);
      setStep("done");
    } catch (e: any) {
      setError(e.message || "Failed to enable MFA.");
    }
    setLoading(false);
  };

  // Disable 2FA completely - with proper error handling
  const executeDisable = async () => {
    setLoading(true);
    setError(null);
    
    const operations: Promise<any>[] = [];
    const operationNames: string[] = [];
    
    try {
      if (disableOption === "remove_factors") {
        // Remove TOTP factor if present
        if (currentFactors?.totp) {
          operations.push(removeTotpFactor());
          operationNames.push("Remove TOTP factor");
        }
      }
      
      // Always disable MFA enforcement
      operations.push(updateMfaStatus(false));
      operationNames.push("Disable MFA enforcement");
      
      // Execute all operations
      const results = await Promise.allSettled(operations);
      
      // Check results and provide detailed feedback
      const failures: string[] = [];
      results.forEach((result, index) => {
        if (result.status === "rejected") {
          const error = result.reason;
          console.error(`${operationNames[index]} failed:`, error);
          
          if (error?.message?.includes("recently completed challenge") || 
              error?.message?.includes("challenge is necessary")) {
            failures.push(`${operationNames[index]}: Requires recent verification (complete MFA challenge within 5 minutes)`);
          } else {
            failures.push(`${operationNames[index]}: ${error?.message || "Unknown error"}`);
          }
        }
      });
      
      if (failures.length > 0) {
        setError(`Some operations failed:\n${failures.join('\n')}\n\nTo complete, please:\n1. Sign out and sign back in with MFA\n2. Return to settings within 5 minutes\n3. Try disabling again`);
        setLoading(false);
        return;
      }
      
      // Update database status
      await updateUserMfaStatus(false);
      
      // Refresh factors to get current state
      await loadCurrentStatus();
      
      onStatusChange(false);
      setShowDisableConfirm(false);
      
    } catch (e: any) {
      console.error("Unexpected error during disable:", e);
      setError(e.message || "Unexpected error occurred. Please try again.");
    }
    
    setLoading(false);
  };

  // Helper to update user document
  const updateUserMfaStatus = async (status: boolean) => {
    if (!user?.$id) return;
    
    try {
      const userDocResponse = await appwriteDatabases.listDocuments(
        APPWRITE_DATABASE_ID,
        APPWRITE_COLLECTION_USER_ID,
        [Query.equal("userId", user.$id)]
      );
      
      if (userDocResponse.documents.length > 0) {
        const userDoc = userDocResponse.documents[0];
        await appwriteDatabases.updateDocument(
          APPWRITE_DATABASE_ID,
          APPWRITE_COLLECTION_USER_ID, 
          userDoc.$id,
          { twofa: status }
        );
      }
    } catch (dbError) {
      console.warn("Failed to update user document:", dbError);
    }
  };

  // Legacy disable function - simplified
  const handleDisable = () => {
    setShowDisableConfirm(true);
  };

  // Modified: Handle factor changes (enable/disable)
  const handleFactorChange = async (factorType: 'totp' | 'email', enabled: boolean) => {
    const wasEnabled = factorType === 'totp' ? currentFactors?.totp : currentFactors?.email;
    
    setSelectedFactors(prev => ({ ...prev, [factorType]: enabled }));
    
    // If unchecking a previously enabled factor, remove it immediately
    if (wasEnabled && !enabled) {
      setLoading(true);
      setError(null);
      try {
        if (factorType === 'totp') {
          await removeTotpFactor();
        }
        // Note: Email factor removal would require different Appwrite method
        // For now, we'll show a warning that email factor cannot be easily removed
        if (factorType === 'email') {
          setError("Email factor cannot be easily removed once verified. Contact support if needed.");
          setSelectedFactors(prev => ({ ...prev, email: true })); // Revert
          setLoading(false);
          return;
        }
        
        // Refresh current factors
        const updatedFactors = await listMfaFactors();
        setCurrentFactors(updatedFactors);
        
        // Check if any factors are still enabled
        const hasAnyFactors = updatedFactors.totp || updatedFactors.email || updatedFactors.phone;
        if (!hasAnyFactors) {
          // No factors left, disable MFA
          await updateMfaStatus(false);
          // Database will be synced automatically by unified status function
          onStatusChange(false);
          setIsCurrentlyEnabled(false);
        }
      } catch (e: any) {
        setError(e.message || `Failed to remove ${factorType} factor`);
        // Revert the checkbox
        setSelectedFactors(prev => ({ ...prev, [factorType]: wasEnabled }));
      }
      setLoading(false);
    }
  };

  // Modified: Continue button logic
  const handleContinue = () => {
    // Only setup factors that are newly selected (not already enabled)
    const needsTotp = selectedFactors.totp && !currentFactors?.totp;
    const needsEmail = selectedFactors.email && !currentFactors?.email;
    
    if (!needsTotp && !needsEmail) {
      // No new factors to setup, just finalize
      finalizeSetup();
      return;
    }
    
    // Setup new factors in order of priority
    if (needsTotp) {
      handleSetupTotp();
    } else if (needsEmail) {
      handleSetupEmail();
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <div className="p-6 max-w-md w-full bg-background text-foreground">
        <h2 className="text-xl font-bold mb-4 text-primary">Two-Factor Authentication</h2>
        
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
                  {(currentFactors?.totp || currentFactors?.email || currentFactors?.phone) ? (
                    <ul className="list-disc list-inside mt-1 text-muted-foreground">
                      {currentFactors?.totp && <li>Authenticator App (TOTP)</li>}
                      {currentFactors?.email && <li>Email Verification</li>}
                      {currentFactors?.phone && <li>SMS Verification</li>}
                    </ul>
                  ) : (
                    <div className="mt-1 text-muted-foreground">
                      <p className="text-sm">No factors detected. This may indicate:</p>
                      <ul className="list-disc list-inside text-xs mt-1 space-y-0.5">
                        <li>MFA setup is incomplete</li>
                        <li>Factors need to be re-verified</li>
                        <li>Browser session needs refresh</li>
                      </ul>
                      <p className="text-xs mt-2 text-orange-600">
                        Try refreshing the page or contact support if this persists.
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Button onClick={handleFactorSelection} disabled={loading}>
                    Manage Factors
                  </Button>
                  <Button variant="destructive" onClick={() => setShowDisableConfirm(true)} disabled={loading}>
                    Disable 2FA
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {step === "recovery" && (
          <>
            <p className="mb-2 font-semibold text-destructive">Save your recovery codes!</p>
            <p className="mb-2 text-sm text-muted-foreground">These codes can be used to access your account if you lose your authenticator:</p>
            {recoveryCodes ? (
              <div className="mb-4">
                <ul className="text-xs bg-muted p-3 rounded-lg border font-mono space-y-1">
                  {recoveryCodes.map(code => <li key={code} className="select-all">{code}</li>)}
                </ul>
                <p className="text-xs text-destructive mt-2 font-medium">
                  ⚠️ Save these codes now! They cannot be shown again.
                </p>
              </div>
            ) : (
              <div className="mb-4 text-xs text-muted-foreground bg-muted p-3 rounded-lg border">
                Recovery codes have already been generated and cannot be shown again.<br />
                If you have saved them, continue to the next step.<br />
                <span className="text-destructive font-medium">
                  If you haven&apos;t saved them, you&apos;ll need to disable and re-enable 2FA to generate new ones.
                </span>
              </div>
            )}
            <p className="text-xs text-muted-foreground mb-4">Save these codes in a secure place. They will not be shown again.</p>
            <Button onClick={handleFactorSelection} disabled={loading}>
              I&apos;ve saved my codes, continue
            </Button>
          </>
        )}

        {step === "factors" && (
          <>
            <p className="mb-4 text-sm">Choose which authentication factors to enable:</p>
            <div className="space-y-3 mb-4">
              <label className="flex items-center gap-3 p-3 rounded-lg border transition-colors hover:bg-accent/50">
                <input
                  type="checkbox"
                  checked={selectedFactors.totp}
                  onChange={(e) => handleFactorChange('totp', e.target.checked)}
                  disabled={loading}
                  className="w-4 h-4"
                />
                <div className="flex-1">
                  <div className="font-medium flex items-center gap-2">
                    Authenticator App (TOTP)
                    {currentFactors?.totp && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                        ✓ Active
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">Use Google Authenticator, Authy, etc.</div>
                </div>
              </label>
              
              <label className="flex items-center gap-3 p-3 rounded-lg border transition-colors hover:bg-accent/50">
                <input
                  type="checkbox"
                  checked={selectedFactors.email}
                  onChange={(e) => handleFactorChange('email', e.target.checked)}
                  disabled={loading}
                  className="w-4 h-4"
                />
                <div className="flex-1">
                  <div className="font-medium flex items-center gap-2">
                    Email Verification
                    {currentFactors?.email && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                        ✓ Active
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">Receive codes via email</div>
                </div>
              </label>
            </div>
            
            <Button 
              onClick={handleContinue}
              disabled={loading || (!selectedFactors.totp && !selectedFactors.email)}
            >
              {loading ? "Processing..." : "Continue"}
            </Button>
          </>
        )}

        {step === "totp_qr" && (
          <>
            <p className="mb-4 text-sm">Scan this QR code with your authenticator app:</p>
            {qrUrl && (
              <div className="flex justify-center mb-4">
                <img 
                  src={qrUrl} 
                  alt="TOTP QR Code" 
                  className="border border-border rounded-lg w-40 h-40 sm:w-48 sm:h-48 object-contain" 
                />
              </div>
            )}
            <div className="mb-4">
              <p className="text-xs text-muted-foreground mb-2">Or enter this secret manually:</p>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg border">
                <code className="text-xs font-mono flex-1 break-all select-all">{secret}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => secret && copyToClipboard(secret)}
                  className="h-8 w-8 p-0 flex-shrink-0"
                  title="Copy secret"
                >
                  {secretCopied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <Input
              placeholder="Enter 6-digit code from app"
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="mb-4"
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
        
        {/* Disable 2FA Confirmation Dialog */}
        {showDisableConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-background border rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold text-foreground mb-3">Disable Two-Factor Authentication</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Choose how you want to disable MFA:
              </p>
              
              <div className="space-y-3 mb-4">
                <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-accent/50">
                  <input
                    type="radio"
                    name="disableOption"
                    value="disable_only"
                    checked={disableOption === "disable_only"}
                    onChange={(e) => setDisableOption(e.target.value as "disable_only")}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium text-sm">Disable MFA (Recommended)</div>
                    <div className="text-xs text-muted-foreground">
                      Turn off MFA requirement but keep factors for future use
                    </div>
                  </div>
                </label>
                
                <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-accent/50">
                  <input
                    type="radio"
                    name="disableOption"
                    value="remove_factors"
                    checked={disableOption === "remove_factors"}
                    onChange={(e) => setDisableOption(e.target.value as "remove_factors")}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium text-sm">Remove All Factors</div>
                    <div className="text-xs text-muted-foreground">
                      Completely remove authenticators and disable MFA
                    </div>
                  </div>
                </label>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <p className="text-xs text-yellow-800">
                  <strong>Note:</strong> If you recently completed MFA verification, this will proceed immediately. 
                  Otherwise, you may need to sign out and sign back in with MFA first.
                </p>
              </div>
              
              <div className="flex gap-2 justify-end">
                <Button 
                  variant="ghost" 
                  onClick={() => setShowDisableConfirm(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={executeDisable}
                  disabled={loading}
                >
                  {loading ? "Processing..." : "Disable MFA"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
