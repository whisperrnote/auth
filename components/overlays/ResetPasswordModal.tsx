"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createPasswordRecovery, updatePasswordRecovery } from "@/lib/appwrite";
import toast from "react-hot-toast";

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ResetPasswordModal({ isOpen, onClose }: ResetPasswordModalProps) {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordAgain, setPasswordAgain] = useState("");
  const [loading, setLoading] = useState(false);

  const userId = params.get("userId") || "";
  const secret = params.get("secret") || "";

  // If userId/secret are present, show reset form. Otherwise, show request form.
  const showResetForm = !!userId && !!secret;

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createPasswordRecovery(
        email,
        window.location.origin + "/reset-password",
      );
      toast.success("Password reset email sent! Check your inbox.");
      setEmail("");
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast.error(err.message || "Error sending reset email.");
    }
    setLoading(false);
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== passwordAgain) {
      toast.error("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await updatePasswordRecovery(userId, secret, password);
      toast.success("Password reset successful! You can now log in.");
      onClose();
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast.error(err.message || "Error resetting password.");
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="min-h-screen w-full flex items-center justify-center py-8">
        <Card className="w-full max-w-md shadow-2xl relative bg-background">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Reset Password</CardTitle>
          </CardHeader>
          <CardContent>
            {showResetForm ? (
              <form onSubmit={handleReset} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">New Password</label>
                  <Input
                    type="password"
                    placeholder="New password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Confirm Password</label>
                  <Input
                    type="password"
                    placeholder="Repeat new password"
                    value={passwordAgain}
                    onChange={(e) => setPasswordAgain(e.target.value)}
                    required
                  />
                </div>
                <Button className="w-full" type="submit" disabled={loading}>
                  {loading ? "Resetting..." : "Reset Password"}
                </Button>
                <Button
                  variant="ghost"
                  type="button"
                  className="w-full"
                  onClick={onClose}
                >
                  Cancel
                </Button>
              </form>
            ) : (
              <form onSubmit={handleRequest} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email address</label>
                  <Input
                    type="email"
                    placeholder="Your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button className="w-full" type="submit" disabled={loading}>
                  {loading ? "Sending..." : "Send Reset Email"}
                </Button>
                <Button
                  variant="ghost"
                  type="button"
                  className="w-full"
                  onClick={onClose}
                >
                  Cancel
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
