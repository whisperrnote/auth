"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useAppwrite } from "@/app/appwrite-provider";
import { listMfaFactors, createMfaChallenge, completeMfaChallenge, addEmailFactor } from "@/lib/appwrite";

export default function MasterpassResetPage() {
  const router = useRouter();
  const { user, resetMasterpass } = useAppwrite();
  const [factors, setFactors] = useState<{ totp: boolean; email: boolean; phone: boolean } | null>(null);
  const [selectedFactor, setSelectedFactor] = useState<"totp" | "email" | "recoverycode" | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"verify" | "reset" | "done">("verify");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }
    (async () => {
      try {
        const mfaFactors = await listMfaFactors();
        setFactors(mfaFactors);
        if (mfaFactors.totp) setSelectedFactor("totp");
        else if (mfaFactors.email) setSelectedFactor("email");
        else setSelectedFactor(null);
      } catch {
        setFactors(null);
      }
    })();
  }, [user, router]);

  const handleCreateChallenge = async (factor: "totp" | "email" | "recoverycode") => {
    setLoading(true);
    setError(null);
    try {
      const challenge = await createMfaChallenge(factor);
      setChallengeId(challenge.$id);
      setSelectedFactor(factor);
    } catch (e: any) {
      setError(e.message || "Failed to create challenge");
    }
    setLoading(false);
  };

  const handleCompleteChallenge = async () => {
    if (!challengeId || !code) return;
    setLoading(true);
    setError(null);
    try {
      await completeMfaChallenge(challengeId, code);
      setStep("reset");
    } catch (e: any) {
      setError(e.message || "Invalid code");
    }
    setLoading(false);
  };

  const handleReset = async () => {
    setLoading(true);
    setError(null);
    try {
      await resetMasterpass();
      setStep("done");
    } catch (e: any) {
      setError("Failed to reset master password");
    }
    setLoading(false);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Reset Master Password</CardTitle>
          <p className="text-sm text-muted-foreground">
            {step === "verify"
              ? "Verify your identity to reset your master password."
              : step === "reset"
              ? "This will wipe all your encrypted data. Are you sure?"
              : "Master password and all data have been wiped."}
          </p>
        </CardHeader>
        <CardContent>
          {step === "verify" && (
            <>
              {factors && (factors.totp || factors.email) ? (
                <>
                  {!challengeId ? (
                    <div className="space-y-4">
                      <p className="text-sm">Choose a verification method:</p>
                      {factors.totp && (
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => handleCreateChallenge("totp")}
                          disabled={loading}
                        >
                          📱 Authenticator App
                        </Button>
                      )}
                      {factors.email && (
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => handleCreateChallenge("email")}
                          disabled={loading}
                        >
                          ✉️ Email Code
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm mb-2">
                          {selectedFactor === "totp" && "Enter the code from your authenticator app:"}
                          {selectedFactor === "email" && "Enter the code sent to your email:"}
                        </p>
                        <Input
                          placeholder="6-digit code"
                          value={code}
                          onChange={(e) => setCode(e.target.value)}
                          maxLength={6}
                        />
                      </div>
                      <Button
                        onClick={handleCompleteChallenge}
                        disabled={loading || !code}
                        className="w-full"
                      >
                        {loading ? "Verifying..." : "Verify"}
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                // No 2FA enabled, fallback to email verification
                <div className="space-y-4">
                  <p className="text-sm">
                    No 2FA enabled. Please check your email for a verification link to proceed.
                  </p>
                  <Button
                    onClick={async () => {
                      setLoading(true);
                      setError(null);
                      try {
                        await addEmailFactor(user.email, ""); // Password may be required if updating email
                        setStep("reset");
                      } catch (e: any) {
                        setError(e.message || "Failed to send verification email");
                      }
                      setLoading(false);
                    }}
                    disabled={loading}
                  >
                    {loading ? "Sending..." : "Send Verification Email"}
                  </Button>
                </div>
              )}
            </>
          )}
          {step === "reset" && (
            <div className="space-y-4">
              <p className="text-red-600 text-sm">
                This will permanently delete all your encrypted data and cannot be undone.
              </p>
              <Button
                variant="destructive"
                className="w-full"
                onClick={handleReset}
                disabled={loading}
              >
                {loading ? "Resetting..." : "Reset Master Password & Wipe Data"}
              </Button>
            </div>
          )}
          {step === "done" && (
            <div className="space-y-4 text-center">
              <p className="text-green-700 text-sm">
                Your master password and all encrypted data have been wiped.
              </p>
              <Button className="w-full" onClick={() => router.replace("/login")}>
                Back to Login
              </Button>
            </div>
          )}
          {error && (
            <div className="text-red-600 text-sm mt-4 text-center">{error}</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
