"use client";
import { useState } from "react";
import { useAppwrite } from "@/app/appwrite-provider";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function OTPLoginPage() {
  const { loading } = useAppwrite();
  const [email, setEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [userId, setUserId] = useState("");
  const [secret, setSecret] = useState("");
  const [securityPhrase, setSecurityPhrase] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  // These should be implemented in your AppwriteProvider for real use
  async function sendOTP(email: string) {
    setError(null);
    setMessage("");
    try {
      // @ts-ignore
      const resp = await window.appwriteAccount.createEmailToken(
        window.ID.unique(),
        email,
        true // enable security phrase
      );
      setUserId(resp.userId);
      setSecurityPhrase(resp.phrase || "");
      setOtpSent(true);
      setMessage("OTP sent! Check your email.");
    } catch (e: any) {
      setError(e.message || "Error sending OTP.");
    }
  }

  async function verifyOTP(userId: string, secret: string) {
    setError(null);
    setMessage("");
    try {
      // @ts-ignore
      await window.appwriteAccount.createSession(userId, secret);
      setMessage("Logged in!");
      window.location.href = "/dashboard";
    } catch (e: any) {
      setError(e.message || "Invalid OTP.");
    }
  }

  return (
    <div className="flex justify-center items-center min-h-screen">
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-xl font-bold mb-2">Sign in with OTP</h2>
          {!otpSent ? (
            <>
              <input
                className="input w-full"
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
              <Button className="w-full" onClick={() => sendOTP(email)} disabled={loading}>
                Send OTP
              </Button>
            </>
          ) : (
            <>
              {securityPhrase && (
                <div className="mb-2 text-sm text-muted-foreground">
                  <strong>Security Phrase:</strong> {securityPhrase}
                </div>
              )}
              <input
                className="input w-full"
                type="text"
                placeholder="User ID (from email)"
                value={userId}
                onChange={e => setUserId(e.target.value)}
                disabled
              />
              <input
                className="input w-full"
                type="text"
                placeholder="OTP Secret"
                value={secret}
                onChange={e => setSecret(e.target.value)}
              />
              <Button className="w-full" onClick={() => verifyOTP(userId, secret)} disabled={loading}>
                Verify OTP
              </Button>
            </>
          )}
          {message && <div className="text-green-700 text-sm text-center">{message}</div>}
          {error && <div className="text-red-600 text-sm text-center">{error}</div>}
        </CardContent>
      </Card>
    </div>
  );
}
