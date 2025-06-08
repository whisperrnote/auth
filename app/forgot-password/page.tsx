"use client";
import { useState } from "react";
import { useAuth } from "@/app/providers";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    try {
      await forgotPassword(email);
      setMessage("Password reset link sent! Check your email.");
    } catch (e: any) {
      setMessage(e.message || "Error sending reset link.");
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen">
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-xl font-bold mb-2">Forgot Password?</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              className="input w-full"
              type="email"
              placeholder="Your email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            <Button className="w-full" type="submit">Send Reset Link</Button>
          </form>
          {message && <div className="text-sm text-center text-muted-foreground">{message}</div>}
        </CardContent>
      </Card>
    </div>
  );
}
