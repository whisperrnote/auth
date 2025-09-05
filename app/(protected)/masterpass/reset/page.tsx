"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useAppwrite } from "@/app/appwrite-provider";
import { resetMasterpassAndWipe } from "@/lib/appwrite";
import toast from "react-hot-toast";
import VaultGuard from "@/components/layout/VaultGuard";

export default function MasterpassResetPage() {
  const router = useRouter();
  const { user } = useAppwrite();
  const [step, setStep] = useState<"reset" | "done">("reset");
  const [loading, setLoading] = useState(false);

  // Redirect to login if not logged in
  useEffect(() => {
    if (!user) {
      router.replace("/login");
    }
  }, [user, router]);

  const handleReset = async () => {
    setLoading(true);
    try {
      if (user) {
        await resetMasterpassAndWipe(user.$id);
        setStep("done");
      }
    } catch (e: unknown) {
      toast.error("Failed to reset master password");
    }
    setLoading(false);
  };

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <VaultGuard>
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            {/* Account name/email for personalization */}
            {user && (
              <div className="mb-2">
                <span className="font-semibold text-base">
                  {user.name || user.email}
                </span>
                {user.email && user.name && (
                  <div className="text-xs text-muted-foreground">
                    {user.email}
                  </div>
                )}
              </div>
            )}
            <CardTitle className="text-2xl">Reset Master Password</CardTitle>
            <p className="text-sm text-muted-foreground">
              {step === "reset"
                ? "This will wipe all your encrypted data. Are you sure?"
                : "Master password and all data have been wiped."}
            </p>
          </CardHeader>
          <CardContent>
            {step === "reset" && (
              <div className="space-y-4">
                <p className="text-red-600 text-sm">
                  This will permanently delete all your encrypted data and
                  cannot be undone.
                </p>
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={handleReset}
                  disabled={loading}
                >
                  {loading
                    ? "Resetting..."
                    : "Reset Master Password & Wipe Data"}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.back()}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </div>
            )}
            {step === "done" && (
              <div className="space-y-4 text-center">
                <p className="text-green-700 text-sm">
                  Your master password and all encrypted data have been wiped.
                </p>
                <Button
                  className="w-full"
                  onClick={() => router.replace("/masterpass")}
                >
                  Set New Master Password
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </VaultGuard>
  );
}
