"use client";
import { useState } from "react";
import { useAuth } from "@/app/providers";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function OTPLoginPage() {
  const { sendMagicLink, sendOTP, verifyOTP } = useAuth();
  const [email, setEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [userId, setUserId] = useState("");
  const [secret, setSecret] = useState("");
  const [mode, setMode] = useState<"magic" | "otp">("magic");
  const [message, setMessage] = useState("");

  const handleSend = async () => {
    setMessage("");
    try {
      if (mode === "magic") {
        await sendMagicLink(email, window.location.origin + "/login");
        setMessage("Magic link sent! Check your email.");
      } else {
        await sendOTP(email);
        setOtpSent(true);
        setMessage("OTP sent! Check your email.");
      }
    } catch (e: any) {
      setMessage(e.message || "Error sending link/OTP.");
    }
  };

  const handleVerify = async () => {
    setMessage("");
    try {
      await verifyOTP(userId, secret);
      setMessage("Logged in!");
    } catch (e: any) {
      setMessage(e.message || "Invalid OTP.");
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen">
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-xl font-bold mb-2">Sign in with {mode === "magic" ? "Magic Link" : "OTP"}</h2>
          <div className="flex gap-2 mb-2">
            <Button variant={mode === "magic" ? "default" : "outline"} onClick={() => setMode("magic")}>Magic Link</Button>
            <Button variant={mode === "otp" ? "default" : "outline"} onClick={() => setMode("otp")}>OTP</Button>
          </div>
          {!otpSent || mode === "magic" ? (
            <>
              <input
                className="input w-full"
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
              <Button className="w-full" onClick={handleSend}>
                {mode === "magic" ? "Send Magic Link" : "Send OTP"}
              </Button>
            </>
          ) : (
            <>
              <input
                className="input w-full"
                type="text"
                placeholder="User ID (from email)"
                value={userId}
                onChange={e => setUserId(e.target.value)}
              />
              <input
                className="input w-full"
                type="text"
                placeholder="OTP Secret"
                value={secret}
                onChange={e => setSecret(e.target.value)}
              />
              <Button className="w-full" onClick={handleVerify}>Verify OTP</Button>
            </>
          )}
          {message && <div className="text-sm text-center text-muted-foreground">{message}</div>}
        </CardContent>
      </Card>
    </div>
  );
}
