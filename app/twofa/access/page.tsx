"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { listMfaFactors, createMfaChallenge, completeMfaChallenge } from "@/lib/appwrite";
import { useAppwrite } from "@/app/appwrite-provider";
import { hasMasterpass, redirectIfAuthenticated } from "@/lib/appwrite";
import { Navbar } from "@/components/layout/Navbar";

export default function TwofaAccessPage() {
  const router = useRouter();
  const { user, isVaultUnlocked } = useAppwrite();
  const [factors, setFactors] = useState<{ totp: boolean; email: boolean; phone: boolean } | null>(null);
  const [selectedFactor, setSelectedFactor] = useState<"totp" | "email" | "phone" | "recoverycode" | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);

  useEffect(() => {
    loadFactors();
  }, []);

  useEffect(() => {
    redirectIfAuthenticated(user, isVaultUnlocked, router);
  }, [user, router, isVaultUnlocked]);

  const loadFactors = async () => {
    try {
      const mfaFactors = await listMfaFactors();
      setFactors(mfaFactors);
      
      // Auto-select the first available factor
      if (mfaFactors.totp) setSelectedFactor("totp");
      else if (mfaFactors.email) setSelectedFactor("email");
      else if (mfaFactors.phone) setSelectedFactor("phone");
    } catch (error) {
      console.error("Failed to load MFA factors:", error);
      setError("Failed to load authentication factors");
    }
  };

  const handleCreateChallenge = async (factor: "totp" | "email" | "phone" | "recoverycode") => {
    setLoading(true);
    setError(null);
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
      // Success! User is now fully authenticated, go to masterpass
      router.replace("/masterpass");
    } catch (e: any) {
      setError(e.message || "Invalid code");
    }
    setLoading(false);
  };

  if (!factors) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
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
                    setError(null);
                  }}
                >
                  Choose different method
                </Button>
              </div>
            )}
            
            {error && (
              <div className="text-red-600 text-sm mt-4 text-center">{error}</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

