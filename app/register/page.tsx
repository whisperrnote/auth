"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Eye, EyeOff, Sun, Moon, Monitor, Check, Mail, KeyRound, Link2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useTheme } from "@/app/providers";
import { useAppwrite } from "../appwrite-provider";
import { useRouter } from "next/navigation";

const OTP_COOLDOWN = 120; // seconds

type Mode = "password" | "otp" | "magic";

export default function RegisterPage() {
  const [mode, setMode] = useState<Mode>("password");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    otp: "",
    userId: "",
  });
  const { theme, setTheme } = useTheme();
  const { register, loading } = useAppwrite();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  // OTP/Magic state
  const [otpSent, setOtpSent] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [securityPhrase, setSecurityPhrase] = useState("");
  const [otpCooldown, setOtpCooldown] = useState(0);
  const otpTimer = useRef<NodeJS.Timeout | null>(null);

  // Cooldown logic using localStorage
  useEffect(() => {
    if (mode === "otp" && formData.email) {
      const last = localStorage.getItem("register_otp_last_" + formData.email);
      if (last) {
        const elapsed = Math.floor((Date.now() - Number(last)) / 1000);
        if (elapsed < OTP_COOLDOWN) setOtpCooldown(OTP_COOLDOWN - elapsed);
      }
    }
    return () => {
      if (otpTimer.current) clearInterval(otpTimer.current);
    };
    // eslint-disable-next-line
  }, [mode, formData.email]);

  useEffect(() => {
    if (otpCooldown > 0) {
      otpTimer.current = setInterval(() => {
        setOtpCooldown((c) => {
          if (c <= 1 && otpTimer.current) clearInterval(otpTimer.current);
          return c - 1;
        });
      }, 1000);
    }
    return () => {
      if (otpTimer.current) clearInterval(otpTimer.current);
    };
  }, [otpCooldown]);

  // Handlers
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (mode === "password") {
      if (formData.password !== formData.confirmPassword) {
        setError("Passwords don't match");
        return;
      }
      try {
        await register(formData.email, formData.password, formData.name);
        router.replace("/dashboard");
      } catch (err: any) {
        setError(err?.message || "Registration failed");
      }
    } else if (mode === "otp") {
      try {
        // @ts-ignore
        await window.appwriteAccount.createSession(formData.userId, formData.otp);
        router.replace("/dashboard");
      } catch (err: any) {
        setError(err?.message || "Invalid OTP.");
      }
    }
    // Magic handled separately
  };

  const handleSendOTP = async () => {
    setError(null);
    try {
      // @ts-ignore
      const resp = await window.appwriteAccount.createEmailToken(
        window.ID.unique(),
        formData.email,
        true
      );
      setOtpSent(true);
      setSecurityPhrase(resp.phrase || "");
      setFormData((f) => ({ ...f, userId: resp.userId }));
      localStorage.setItem("register_otp_last_" + formData.email, Date.now().toString());
      setOtpCooldown(OTP_COOLDOWN);
    } catch (e: any) {
      setError(e.message || "Error sending OTP.");
    }
  };

  const handleSendMagic = async () => {
    setError(null);
    try {
      // @ts-ignore
      await window.appwriteAccount.createMagicURLToken(
        window.ID.unique(),
        formData.email,
        window.location.origin + "/register"
      );
      setMagicSent(true);
      setTimeout(() => setMagicSent(false), 4000);
    } catch (e: any) {
      setError(e.message || "Error sending magic link.");
    }
  };

  // UI
  const modeButtons = [
    { label: "Password", value: "password", icon: KeyRound },
    { label: "OTP", value: "otp", icon: Mail },
    { label: "Magic Link", value: "magic", icon: Link2 },
  ] as const;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Simple navbar for register page */}
      <nav className="border-b border-border">
        <div className="max-w-screen-xl mx-auto flex justify-between items-center h-16 px-4">
          <div className="flex items-center gap-2">
            <img
              src="/images/logo.png"
              alt="Whisperrauth Logo"
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              {error && <div className="text-red-600 text-sm">{error}</div>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating..." : "Create Account"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/login" className="text-primary hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
