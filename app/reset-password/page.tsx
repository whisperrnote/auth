"use client";
import { useState } from "react";
import { useAuth } from "@/app/providers";
import { useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function ResetPasswordPage() {
  const { resetPassword } = useAuth();
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [passwordAgain, setPasswordAgain] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const userId = params.get("userId") || "";
  const secret = params.get("secret") || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    if (password !== passwordAgain) {
      setMessage("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await resetPassword(userId, secret, password, passwordAgain);
      setMessage("Password reset successful! You can now log in.");
    } catch (e: any) {
      setMessage(e.message || "Error resetting password.");
    }
    setLoading(false);
  };

  return (
    <div className="flex justify-center items-center min-h-screen">
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-xl font-bold mb-2">Reset Password</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              className="input w-full"
              type="password"
              placeholder="New password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            <input
              className="input w-full"
              type="password"
              placeholder="Repeat new password"
              value={passwordAgain}
              onChange={e => setPasswordAgain(e.target.value)}
              required
            />
            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? "Resetting..." : "Reset Password"}
            </Button>
          </form>
          {message && <div className="text-sm text-center text-muted-foreground">{message}</div>}
        </CardContent>
      </Card>
    </div>
  );
}
