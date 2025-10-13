"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { completeEmailVerification } from "@/lib/appwrite";

interface VerifyEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function VerifyEmailModal({ isOpen, onClose }: VerifyEmailModalProps) {
  const params = useSearchParams();
  const router = useRouter();

  const [status, setStatus] = useState<
    "idle" | "verifying" | "success" | "error" | "missing"
  >("idle");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    if (!isOpen) return;

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
  }, [isOpen, params]);

  const goToSettings = () => {
    onClose();
    router.replace("/settings");
  };
  
  const goHome = () => {
    onClose();
    router.replace("/");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm">
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl relative bg-background">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Verify Email</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {status === "verifying" && (
              <p className="text-sm text-muted-foreground text-center">Verifying…</p>
            )}

            {status === "missing" && (
              <div className="space-y-3">
                <p className="text-sm text-red-600">{message}</p>
                <p className="text-xs text-muted-foreground">
                  Please open the most recent verification email and try again.
                </p>
                <div className="flex gap-2">
                  <Button onClick={goHome} className="flex-1">Go Home</Button>
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
                  <Button onClick={goToSettings} className="flex-1">Open Settings</Button>
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
                  <Button onClick={goToSettings} className="flex-1">Open Settings</Button>
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
    </div>
  );
}
