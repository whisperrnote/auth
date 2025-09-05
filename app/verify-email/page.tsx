"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Navbar } from "@/components/layout/Navbar";
import { completeEmailVerification } from "@/lib/appwrite";

export default function VerifyEmailPage() {
  const params = useSearchParams();
  const router = useRouter();

  const [status, setStatus] = useState<
    "idle" | "verifying" | "success" | "error" | "missing"
  >("idle");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    const userId = params.get("userId");
    const secret = params.get("secret");

    if (!userId || !secret) {
      setStatus("missing");
      setMessage("Verification link is missing required parameters.");
      return;
    }

    const run = async () => {
      setStatus("verifying");
      try {
        await completeEmailVerification(userId, secret);
        setStatus("success");
        setMessage("Email verified successfully.");
      } catch (e: unknown) {
        const err = e as { message?: string };
        setStatus("error");
        setMessage(
          err?.message ||
            "Verification failed. The link may have expired or was already used."
        );
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goToSettings = () => router.replace("/settings");
  const goHome = () => router.replace("/");

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <div className="flex-1 flex justify-center items-center p-4">
        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="text-xl font-bold">Verify Email</h2>

            {status === "verifying" && (
              <p className="text-sm text-muted-foreground">Verifying…</p>
            )}

            {status === "missing" && (
              <div className="space-y-3">
                <p className="text-sm text-red-600">{message}</p>
                <p className="text-xs text-muted-foreground">
                  Please open the most recent verification email and try again.
                </p>
                <div className="flex gap-2">
                  <Button onClick={goHome}>Go Home</Button>
                </div>
              </div>
            )}

            {status === "success" && (
              <div className="space-y-3">
                <p className="text-sm text-green-600">{message}</p>
                <p className="text-xs text-muted-foreground">
                  You can now continue setting up MFA or using your account.
                </p>
                <div className="flex gap-2">
                  <Button onClick={goToSettings}>Open Settings</Button>
                  <Button variant="ghost" onClick={goHome}>
                    Go Home
                  </Button>
                </div>
              </div>
            )}

            {status === "error" && (
              <div className="space-y-3">
                <p className="text-sm text-red-600">{message}</p>
                <p className="text-xs text-muted-foreground">
                  If the link expired, request a new verification email from
                  Settings.
                </p>
                <div className="flex gap-2">
                  <Button onClick={goToSettings}>Open Settings</Button>
                  <Button variant="ghost" onClick={goHome}>
                    Go Home
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
