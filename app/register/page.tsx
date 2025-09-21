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
import { getMfaAuthenticationStatus, hasMasterpass } from "@/lib/appwrite";
import { redirectIfAuthenticated } from "@/lib/appwrite";
import { Navbar } from "@/components/layout/Navbar";
import { cn } from "@/lib/utils";

const OTP_COOLDOWN = 120; // seconds

type Mode = "password" | "otp";

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
  const searchParams = useSearchParams();
  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setFormData((prev) => ({ ...prev, email: emailParam }));
    }
    // eslint-disable-next-line
  }, []);
  const { theme, setTheme } = useTheme();
  const {
    registerWithEmailPassword,
    sendEmailOtp,
    completeEmailOtp,
    loading,
    user,
    isVaultUnlocked,
    loginWithEmailPassword,
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

  // Redirect if already logged in and needs master password
  useEffect(() => {
    if (user) {
      (async () => {
        const hasMp = await hasMasterpass(user.$id);
        if (!hasMp || !isVaultUnlocked()) {
          router.replace("/masterpass");
        } else {
          router.replace("/dashboard");
        }
      })();
    }
  }, [user, router, isVaultUnlocked]);

  useEffect(() => {
    if (user) {
      redirectIfAuthenticated(user, isVaultUnlocked, router);
    }
  }, [user, router, isVaultUnlocked]);

  // Handlers
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "password") {
      if (formData.password !== formData.confirmPassword) {
        toast.error("Passwords don't match");
        return;
      }
      try {
        // 1. Create the account
        await registerWithEmailPassword(
          formData.email,
          formData.password,
          formData.name,
        );

        // 2. Immediately create a session (login)
        await loginWithEmailPassword(formData.email, formData.password);

        // 3. Continue with MFA/masterpass logic
        const mfaStatus = await getMfaAuthenticationStatus();

        if (mfaStatus.needsMfa) {
          router.replace("/twofa/access");
        } else if (mfaStatus.isFullyAuthenticated) {
          // Finalize auth after full authentication
          const { finalizeAuth } = (
            await import("@/lib/finalizeAuth")
          ).useFinalizeAuth();
          await finalizeAuth({ redirect: true, fallback: "/login" });
        } else {
          toast.error(mfaStatus.error || "Registration verification failed");
        }
      } catch (err: unknown) {
        const error = err as { type?: string; code?: number; message?: string };
        console.log("Registration error caught:", {
          err,
          type: error.type,
          code: error.code,
          message: error.message,
        });

        // Check if this is an MFA requirement error (can happen during the login step)
        if (
          error.type === "user_more_factors_required" ||
          (error.code === 401 && error.message?.includes("more factors")) ||
          error.message?.includes("More factors are required") ||
          error.message?.includes("user_more_factors_required")
        ) {
          console.log(
            "MFA required during registration login, redirecting to /twofa/access",
          );
          router.replace("/twofa/access");
        } else {
          // If error is "user already exists", show a friendly message
          if (error?.code === 409) {
            toast.error("An account with this email already exists.");
          } else {
            toast.error(error?.message || "Registration failed");
          }
        }
      }
    } else if (mode === "otp") {
      try {
        await completeEmailOtp(formData.userId, formData.otp);

        const mfaStatus = await getMfaAuthenticationStatus();

        if (mfaStatus.needsMfa) {
          router.replace("/twofa/access");
        } else if (mfaStatus.isFullyAuthenticated) {
          // Finalize auth after full authentication
          const { finalizeAuth } = (
            await import("@/lib/finalizeAuth")
          ).useFinalizeAuth();
          await finalizeAuth({ redirect: true, fallback: "/login" });
        } else {
          toast.error(mfaStatus.error || "Registration verification failed");
        }
      } catch (err: unknown) {
        const error = err as { type?: string; code?: number; message?: string };
        console.log("Registration OTP error caught:", {
          err,
          type: error.type,
          code: error.code,
          message: error.message,
        });

        // Check if this is an MFA requirement error
        if (
          error.type === "user_more_factors_required" ||
          (error.code === 401 && error.message?.includes("more factors")) ||
          error.message?.includes("More factors are required") ||
          error.message?.includes("user_more_factors_required")
        ) {
          console.log(
            "MFA required during registration OTP, redirecting to /twofa/access",
          );
          router.replace("/twofa/access");
        } else {
          toast.error(error?.message || "Invalid OTP.");
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
      localStorage.setItem(
        "register_otp_last_" + formData.email,
        Date.now().toString(),
      );
      setOtpCooldown(OTP_COOLDOWN);
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast.error(err.message || "Error sending OTP.");
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
        <Card className="w-full max-w-md">
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
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full shadow-sm transition-all duration-150",
                    {
                      "bg-primary text-primary-foreground scale-105":
                        mode === btn.value,
                      "bg-secondary text-secondary-foreground hover:bg-secondary/80":
                        mode !== btn.value,
                    },
                  )}
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
              {/* Name always visible */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Full Name</label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
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
                />{" "}
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
                        onChange={(e) =>
                          setFormData({ ...formData, password: e.target.value })
                        }
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm your password"
                        value={formData.confirmPassword}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            confirmPassword: e.target.value,
                          })
                        }
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
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
                      onChange={(e) =>
                        setFormData({ ...formData, otp: e.target.value })
                      }
                      disabled={!otpSent}
                      className={`transition-all duration-200 ${!otpSent ? "blur-[2px] opacity-60" : ""}`}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!formData.email || otpCooldown > 0 || loading}
                      onClick={handleSendOTP}
                    >
                      {otpSent ? (
                        <Check className="h-5 w-5 text-primary" />
                      ) : (
                        "Get OTP"
                      )}
                    </Button>
                  </div>
                  {/* Security phrase */}
                  {securityPhrase && otpSent && (
                    <div className="text-xs text-muted-foreground mt-1">
                      <span className="font-semibold">Security Phrase:</span>{" "}
                      {securityPhrase}
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
