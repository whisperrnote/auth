"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { createPasswordRecovery, updatePasswordRecovery } from "@/lib/appwrite";
import { Navbar } from "@/components/layout/Navbar";
import toast from "react-hot-toast";

export default function ResetPasswordPage() {
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
      // Use current origin as redirect URL
      await createPasswordRecovery(email, window.location.origin + "/reset-password");
      toast.success("Password reset email sent! Check your inbox.");
    } catch (e: any) {
      toast.error(e.message || "Error sending reset email.");
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
    } catch (e: any) {
      toast.error(e.message || "Error resetting password.");
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <div className="flex-1 flex justify-center items-center">
        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="text-xl font-bold mb-2">Reset Password</h2>
            {showResetForm ? (
              <form onSubmit={handleReset} className="space-y-3">
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
            ) : (
              <form onSubmit={handleRequest} className="space-y-3">
                <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <input
                  id="reset-email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  type="email"
                  placeholder="Your email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
                <Button className="w-full" type="submit" disabled={loading}>
                  {loading ? "Sending..." : "Send Reset Email"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
