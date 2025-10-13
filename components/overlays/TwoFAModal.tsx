"use client";

import { useState, useEffect } from "react";
import { useFinalizeAuth } from "@/lib/finalizeAuth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  listMfaFactors,
  createMfaChallenge,
  completeMfaChallenge,
  getMfaAuthenticationStatus,
} from "@/lib/appwrite";
import toast from "react-hot-toast";

interface TwoFAModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TwoFAModal({ isOpen, onClose }: TwoFAModalProps) {
  const router = useRouter();
  const [factors, setFactors] = useState<{
    totp: boolean;
    email: boolean;
    phone: boolean;
  } | null>(null);
  const [selectedFactor, setSelectedFactor] = useState<
    "totp" | "email" | "phone" | "recoverycode" | null
  >(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadFactors();
    }
  }, [isOpen]);

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

  const handleCreateChallenge = async (
    factor: "totp" | "email" | "phone" | "recoverycode",
  ) => {
    setLoading(true);
    try {
      let factorEnum: "totp" | "email" | "phone" | "recoverycode" = factor;
      if (factor === "totp") factorEnum = "totp";
      else if (factor === "email") factorEnum = "email";
      else if (factor === "phone") factorEnum = "phone";
      else if (factor === "recoverycode") factorEnum = "recoverycode";
      const challenge = await createMfaChallenge(factorEnum);
      setChallengeId(challenge.$id);
      setSelectedFactor(factor);
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast.error(err.message || "Failed to create challenge");
    }
    setLoading(false);
  };

  const { finalizeAuth } = useFinalizeAuth();

  const handleCompleteChallenge = async () => {
    if (!challengeId || !code) return;

    setLoading(true);
    try {
      await completeMfaChallenge(challengeId, code);
      onClose();
      await finalizeAuth({ redirect: true, fallback: "/login" });
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast.error(err.message || "Invalid code");
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  if (!factors) {
    return (
      <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm">
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="text-lg text-muted-foreground">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm">
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl relative bg-background">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">
              Two-Factor Authentication
            </CardTitle>
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
                    {selectedFactor === "totp" &&
                      "Enter the code from your authenticator app:"}
                    {selectedFactor === "email" &&
                      "Enter the code sent to your email:"}
                    {selectedFactor === "phone" &&
                      "Enter the code sent to your phone:"}
                    {selectedFactor === "recoverycode" &&
                      "Enter your recovery code:"}
                  </p>
                  <Input
                    placeholder={
                      selectedFactor === "recoverycode"
                        ? "Recovery code"
                        : "6-digit code"
                    }
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
    </div>
  );
}
