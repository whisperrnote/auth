"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, Check, Mail, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useTheme } from "@/app/providers";
import { useAppwrite } from "../appwrite-provider";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { getMfaAuthenticationStatus } from "@/lib/appwrite";
import { redirectIfAuthenticated } from "@/lib/appwrite";
import { Navbar } from "@/components/layout/Navbar";

const OTP_COOLDOWN = 120; // seconds

type Mode = "password" | "otp";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("password");
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "", otp: "", userId: "" });
  const searchParams = useSearchParams();
  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setFormData((prev) => ({ ...prev, email: emailParam }));
    }
    // eslint-disable-next-line
  }, []);
  useTheme();
  const {
    loginWithEmailPassword,
    sendEmailOtp,
    completeEmailOtp,
    loading,
    user,
    isVaultUnlocked,
  } = useAppwrite();
  const router = useRouter();

  // OTP state
  const [otpSent, setOtpSent] = useState(false);
  const [securityPhrase, setSecurityPhrase] = useState("");
  const [otpCooldown, setOtpCooldown] = useState(0);
  const otpTimer = useRef<NodeJS.Timeout | null>(null);

  // Cooldown logic using localStorage
  useEffect(() => {
    if (mode === "otp" && formData.email) {
      const last = localStorage.getItem("otp_last_" + formData.email);
      if (last) {
        const elapsed = Math.floor((Date.now() - Number(last)) / 1000);
        if (elapsed < OTP_COOLDOWN) setOtpCooldown(OTP_COOLDOWN - elapsed);
      }
    }
    // Cleanup timer on unmount
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

  // Redirect if already logged in and needs master password
  useEffect(() => {
    // Avoid redirecting away from MFA flow: only redirect when fully authenticated
    (async () => {
      if (!user) return;
      try {
        const mfa = await getMfaAuthenticationStatus();
        if (mfa.isFullyAuthenticated) {
          redirectIfAuthenticated(user, isVaultUnlocked, router);
        }
      } catch {}
    })();
  }, [user, router, isVaultUnlocked]);

  // Handlers
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "password") {
      try {
        await loginWithEmailPassword(formData.email, formData.password);

        // If login succeeds, check MFA status
        const mfaStatus = await getMfaAuthenticationStatus();
        
        if (mfaStatus.needsMfa) {
          router.replace("/twofa/access");
        } else if (mfaStatus.isFullyAuthenticated) {
          // Finalize auth after full authentication
          const { finalizeAuth } = (await import("@/lib/finalizeAuth")).useFinalizeAuth();
          await finalizeAuth({ redirect: true, fallback: "/login" });
        } else {
          toast.error(mfaStatus.error || "Authentication verification failed");
        }
      } catch (err: unknown) {
        const e = err as { type?: string; code?: number; message?: string };
        console.log("Login error caught:", { err: e, type: e?.type, code: e?.code, message: e?.message });
        
        // Check if this is an MFA requirement error
        if (
          e?.type === "user_more_factors_required" ||
          (e?.code === 401 && e?.message?.includes("more factors")) ||
          e?.message?.includes("More factors are required") ||
          e?.message?.includes("user_more_factors_required")
        ) {
          console.log("MFA required during login, redirecting to /twofa/access");
          router.replace("/twofa/access");
        } else {
          toast.error(e?.message || "Login failed");
        }
      }
    } else if (mode === "otp") {
      try {
        await completeEmailOtp(formData.userId, formData.otp);
        
        // Check MFA status after OTP completion
        const mfaStatus = await getMfaAuthenticationStatus();
        
        if (mfaStatus.needsMfa) {
          router.replace("/twofa/access");
        } else if (mfaStatus.isFullyAuthenticated) {
          // Finalize auth after full authentication
          const { finalizeAuth } = (await import("@/lib/finalizeAuth")).useFinalizeAuth();
          await finalizeAuth({ redirect: true, fallback: "/login" });
        } else {
          toast.error(mfaStatus.error || "Authentication verification failed");
        }
      } catch (err: any) {
        console.log("OTP login error caught:", { err, type: err.type, code: err.code, message: err.message });
        
        // Check if this is an MFA requirement error
        if (
          err.type === "user_more_factors_required" ||
          err.code === 401 && err.message?.includes("more factors") ||
          err.message?.includes("More factors are required") ||
          err.message?.includes("user_more_factors_required")
        ) {
          console.log("MFA required during OTP login, redirecting to /twofa/access");
          router.replace("/twofa/access");
        } else {
          toast.error(err?.message || "Invalid OTP.");
        }
      }
    }
    // Magic handled separately
  };

  const handleSendOTP = async () => {
    try {
      const resp = await sendEmailOtp(formData.email, true);
      setOtpSent(true);
      setSecurityPhrase(resp.phrase || "");
      setFormData((f) => ({ ...f, userId: resp.userId }));
      localStorage.setItem("otp_last_" + formData.email, Date.now().toString());
      setOtpCooldown(OTP_COOLDOWN);
    } catch (e: any) {
      toast.error(e.message || "Error sending OTP.");
    }
  };

  // UI
  const modeButtons = [
    { label: "Password", value: "password", icon: KeyRound },
    { label: "OTP", value: "otp", icon: Mail },
  ] as const;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Use Navbar component */}
      <Navbar />

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
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            <p className="text-sm text-muted-foreground">
              Sign in to your Whisperrauth account
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
                  }}
                  type="button"
                >
                  <btn.icon className="h-5 w-5" />
                  {btn.label}
                </button>
              ))}
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email always visible */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                 <Input
                   type="email"
                   value={formData.email}
                    onChange={(e) => {
                      setFormData({ ...formData, email: e.target.value });
                      setOtpSent(false);
                    }}
                   required
                 />              </div>
              {/* Password login */}
              {mode === "password" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Password</label>
                  <div className="relative">
                     <Input
                       type={showPassword ? "text" : "password"}
                       placeholder="Enter your password"
                       value={formData.password}
                       onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                       required
                     />                    <Button
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
              )}
              {/* OTP login */}
              {mode === "otp" && (
                <>
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      
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
              {/* Only show submit for password/otp */}
              {(mode === "password" || (mode === "otp" && otpSent)) && (
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing In..." : "Sign In"}
                </Button>
              )}
            </form>
            <div className="mt-6 text-center space-y-2">
              <Link href="/reset-password" className="text-sm text-primary hover:underline">
                Forgot your password?
              </Link>
              <p className="text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link href="/register" className="text-primary hover:underline">
                  Sign up
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}