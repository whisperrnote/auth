"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { listMfaFactors, createMfaChallenge, completeMfaChallenge, getMfaAuthenticationStatus } from "@/lib/appwrite";

import toast from "react-hot-toast";

export default function TwofaAccessPage() {
  const router = useRouter();
  const [factors, setFactors] = useState<{ totp: boolean; email: boolean; phone: boolean } | null>(null);
  const [selectedFactor, setSelectedFactor] = useState<"totp" | "email" | "phone" | "recoverycode" | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);

  useEffect(() => {
    loadFactors();
  }, []);

  // Make this route unguarded: allow partial sessions to stay
  useEffect(() => {
    const checkMfaStatus = async () => {
      try {
        const mfaStatus = await getMfaAuthenticationStatus();
        if (mfaStatus.isFullyAuthenticated) {
          router.replace("/masterpass");
          return;
        }
        // If needsMfa, do nothing; stay on page
        if (mfaStatus.needsMfa) return;
        // If neither fully auth nor needs MFA, treat as logged-out and send to login
        router.replace("/login");
      } catch (error: any) {
        // If Appwrite signals partial auth explicitly, stay here
        const msg = error?.message || "";
        const type = error?.type || "";
        if (type === "user_more_factors_required" || msg.includes("More factors are required")) {
          return;
        }
        // Otherwise, redirect to login
        router.replace("/login");
      }
    };
    checkMfaStatus();
  }, [router]);

  const loadFactors = async () => {
    try {
      const mfaFactors = await listMfaFactors();
      setFactors(mfaFactors);
      
      // Auto-select the first available factor
      if (mfaFactors.totp) setSelectedFactor("totp");
      else if (mfaFactors.email) setSelectedFactor("email");
      else if (mfaFactors.phone) setSelectedFactor("phone");
    } catch (error) {
      toast.error("Failed to load authentication factors");
    }
  };

  const handleCreateChallenge = async (factor: "totp" | "email" | "phone" | "recoverycode") => {
    setLoading(true);
    try {
      // Use the correct AuthenticationFactor mapping for createMfaChallenge
      let factorEnum: any = factor;
      // Map string to enum if needed (for compatibility with appwrite.ts)
      if (factor === "totp") factorEnum = "totp";
      else if (factor === "email") factorEnum = "email";
      else if (factor === "phone") factorEnum = "phone";
      else if (factor === "recoverycode") factorEnum = "recoverycode";
      const challenge = await createMfaChallenge(factorEnum as any);
      setChallengeId(challenge.$id);
      setSelectedFactor(factor);
    } catch (e: any) {
      toast.error(e.message || "Failed to create challenge");
    }
    setLoading(false);
  };

  const handleCompleteChallenge = async () => {
    if (!challengeId || !code) return;
    
    setLoading(true);
    try {
      await completeMfaChallenge(challengeId, code);
      // Centralized post-auth finalization
      const { finalizeAuth } = (await import("@/lib/finalizeAuth")).useFinalizeAuth();
      await finalizeAuth({ redirect: true, fallback: "/login" });
    } catch (e: any) {
      toast.error(e.message || "Invalid code");
    }
    setLoading(false);
  };

  if (!factors) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">

      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Two-Factor Authentication</CardTitle>
            <p className="text-sm text-muted-foreground">
              Additional verification required
            </p>
          </CardHeader>
          <CardContent>
            {!challengeId ? (
              // Factor selection
              <div className="space-y-4">
                <p className="text-sm">Choose your verification method:</p>
                
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
                
                {factors.phone && (
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => handleCreateChallenge("phone")}
                    disabled={loading}
                  >
                    📞 SMS Code
                  </Button>
                )}
                
                <div className="pt-4 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => setShowRecovery(!showRecovery)}
                  >
                    Use recovery code instead
                  </Button>
                  
                  {showRecovery && (
                    <div className="mt-2">
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => handleCreateChallenge("recoverycode")}
                        disabled={loading}
                      >
                        🔑 Recovery Code
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // Code entry
              <div className="space-y-4">
                <div>
                  <p className="text-sm mb-2">
                    {selectedFactor === "totp" && "Enter the code from your authenticator app:"}
                    {selectedFactor === "email" && "Enter the code sent to your email:"}
                    {selectedFactor === "phone" && "Enter the code sent to your phone:"}
                    {selectedFactor === "recoverycode" && "Enter your recovery code:"}
                  </p>
                  <Input
                    placeholder={selectedFactor === "recoverycode" ? "Recovery code" : "6-digit code"}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    maxLength={selectedFactor === "recoverycode" ? 10 : 6}
                  />
                </div>
                
                <Button
                  onClick={handleCompleteChallenge}
                  disabled={loading || !code}
                  className="w-full"
                >
                  {loading ? "Verifying..." : "Verify"}
                </Button>
                
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setChallengeId(null);
                      setCode("");
                    }}
                  >
                  Choose different method
                </Button>
              </div>
            )}
            
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

