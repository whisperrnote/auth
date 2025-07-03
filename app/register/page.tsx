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
              className="h-8 w-8 rounded-lg object-contain"
            />
            <span className="font-semibold text-lg">Whisperrauth</span>
          </div>
          <div>
            <button
              className="p-2 rounded-full hover:bg-accent"
              onClick={() => {
                const nextTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
                setTheme(nextTheme);
              }}
            >
              {theme === 'light' && <Sun className="h-5 w-5" />}
              {theme === 'dark' && <Moon className="h-5 w-5" />}
              {theme === 'system' && <Monitor className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md glass shadow-2xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <img
                src="/images/logo.png"
                alt="Whisperrauth Logo"
                className="h-12 w-12 rounded-lg object-contain"
              />
            </div>
            <CardTitle className="text-2xl">Create account</CardTitle>
            <p className="text-sm text-muted-foreground">
              Start securing your passwords today
            </p>
          </CardHeader>
          <CardContent>
            {/* Mode Switcher */}
            <div className="flex justify-center gap-2 mb-6">
              {modeButtons.map((btn) => (
                <button
                  key={btn.value}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-md transition-all duration-150
                    ${mode === btn.value
                      ? "bg-primary text-white scale-105"
                      : "bg-white/60 text-[rgb(141,103,72)] hover:bg-primary/20"
                    }`}
                  style={{
                    boxShadow: mode === btn.value
                      ? "0 4px 16px 0 rgba(141,103,72,0.13)"
                      : "0 2px 8px 0 rgba(191,174,153,0.10)"
                  }}
                  onClick={() => {
                    setMode(btn.value as Mode);
                    setError(null);
                  }}
                  type="button"
                >
                  <btn.icon className="h-5 w-5" />
                  {btn.label}
                </button>
              ))}
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name always visible */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Full Name</label>
                <Input
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              {/* Email always visible */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    setOtpSent(false);
                    setMagicSent(false);
                  }}
                  required
                />
              </div>
              {/* Password registration */}
              {mode === "password" && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Password</label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a strong password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Confirm Password</label>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm your password"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </>
              )}
              {/* OTP registration */}
              {mode === "otp" && (
                <>
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      placeholder="Enter OTP"
                      value={formData.otp}
                      onChange={(e) => setFormData({ ...formData, otp: e.target.value })}
                      disabled={!otpSent}
                      className={`transition-all duration-200 ${!otpSent ? "blur-[2px] opacity-60" : ""}`}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="glass"
                      disabled={
                        !formData.email ||
                        otpCooldown > 0 ||
                        loading
                      }
                      onClick={handleSendOTP}
                    >
                      {otpSent ? (
                        <Check className="h-5 w-5 text-green-600" />
                      ) : (
                        "Get OTP"
                      )}
                    </Button>
                  </div>
                  {/* Security phrase */}
                  {securityPhrase && otpSent && (
                    <div className="text-xs text-muted-foreground mt-1">
                      <span className="font-semibold">Security Phrase:</span> {securityPhrase}
                    </div>
                  )}
                  {/* Countdown */}
                  {otpCooldown > 0 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Request again in {otpCooldown}s
                    </div>
                  )}
                </>
              )}
              {/* Magic Link registration */}
              {mode === "magic" && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="glass flex-1"
                    disabled={!formData.email || magicSent || loading}
                    onClick={handleSendMagic}
                  >
                    {magicSent ? (
                      <Check className="h-5 w-5 text-green-600" />
                    ) : (
                      "Get Magic Link"
                    )}
                  </Button>
                </div>
              )}
              {/* Magic link sent message */}
              {mode === "magic" && magicSent && (
                <div className="text-xs text-green-700 mt-2 flex items-center gap-2">
                  <Check className="h-4 w-4" /> Sent! Check your email for the magic link.
                </div>
              )}
              {error && <div className="text-red-600 text-sm">{error}</div>}
              {/* Only show submit for password/otp */}
              {(mode === "password" || (mode === "otp" && otpSent)) && (
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creating..." : "Create Account"}
                </Button>
              )}
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
