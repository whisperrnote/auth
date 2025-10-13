"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, Check, Mail, KeyRound, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useAppwrite } from "@/app/appwrite-provider";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { getMfaAuthenticationStatus, hasMasterpass } from "@/lib/appwrite";

const OTP_COOLDOWN = 120; // seconds

type Mode = "password" | "otp";
type AuthType = "login" | "register";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: AuthType;
}

export function AuthModal({ isOpen, onClose, initialType = "login" }: AuthModalProps) {
  const [authType, setAuthType] = useState<AuthType>(initialType);
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
  }, [searchParams]);

  useEffect(() => {
    setAuthType(initialType);
  }, [initialType]);

  const {
    loginWithEmailPassword,
    registerWithEmailPassword,
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
      const key = authType === "login" ? "otp_last_" : "register_otp_last_";
      const last = localStorage.getItem(key + formData.email);
      if (last) {
        const elapsed = Math.floor((Date.now() - Number(last)) / 1000);
        if (elapsed < OTP_COOLDOWN) setOtpCooldown(OTP_COOLDOWN - elapsed);
      }
    }
    return () => {
      if (otpTimer.current) clearInterval(otpTimer.current);
    };
  }, [mode, formData.email, authType]);

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

  // Close modal and redirect if authenticated
  useEffect(() => {
    if (user) {
      (async () => {
        if (authType === "register") {
          const hasMp = await hasMasterpass(user.$id);
          if (!hasMp || !isVaultUnlocked()) {
            onClose();
            router.replace("/masterpass");
          } else {
            onClose();
            router.replace("/dashboard");
          }
        } else {
          try {
            const mfa = await getMfaAuthenticationStatus();
            if (mfa.isFullyAuthenticated) {
              if (!isVaultUnlocked()) {
                onClose();
                router.replace("/masterpass");
              } else {
                onClose();
                router.replace("/dashboard");
              }
            }
          } catch {}
        }
      })();
    }
  }, [user, router, isVaultUnlocked, authType, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (authType === "register") {
      if (mode === "password") {
        if (formData.password !== formData.confirmPassword) {
          toast.error("Passwords don't match");
          return;
        }
        try {
          await registerWithEmailPassword(
            formData.email,
            formData.password,
            formData.name,
          );
          await loginWithEmailPassword(formData.email, formData.password);
          const mfaStatus = await getMfaAuthenticationStatus();
          if (mfaStatus.needsMfa) {
            onClose();
            router.replace("/twofa/access");
          } else if (mfaStatus.isFullyAuthenticated) {
            const { finalizeAuth } = (
              await import("@/lib/finalizeAuth")
            ).useFinalizeAuth();
            await finalizeAuth({ redirect: true, fallback: "/login" });
          } else {
            toast.error(mfaStatus.error || "Registration verification failed");
          }
        } catch (err: unknown) {
          const error = err as { type?: string; code?: number; message?: string };
          if (
            error.type === "user_more_factors_required" ||
            (error.code === 401 && error.message?.includes("more factors")) ||
            error.message?.includes("More factors are required") ||
            error.message?.includes("user_more_factors_required")
          ) {
            onClose();
            router.replace("/twofa/access");
          } else {
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
            onClose();
            router.replace("/twofa/access");
          } else if (mfaStatus.isFullyAuthenticated) {
            const { finalizeAuth } = (
              await import("@/lib/finalizeAuth")
            ).useFinalizeAuth();
            await finalizeAuth({ redirect: true, fallback: "/login" });
          } else {
            toast.error(mfaStatus.error || "Registration verification failed");
          }
        } catch (err: unknown) {
          const error = err as { type?: string; code?: number; message?: string };
          if (
            error.type === "user_more_factors_required" ||
            (error.code === 401 && error.message?.includes("more factors")) ||
            error.message?.includes("More factors are required") ||
            error.message?.includes("user_more_factors_required")
          ) {
            onClose();
            router.replace("/twofa/access");
          } else {
            toast.error(error?.message || "Invalid OTP.");
          }
        }
      }
    } else {
      // Login flow
      if (mode === "password") {
        try {
          await loginWithEmailPassword(formData.email, formData.password);
          const mfaStatus = await getMfaAuthenticationStatus();
          if (mfaStatus.needsMfa) {
            onClose();
            router.replace("/twofa/access");
          } else if (mfaStatus.isFullyAuthenticated) {
            const { finalizeAuth } = (
              await import("@/lib/finalizeAuth")
            ).useFinalizeAuth();
            await finalizeAuth({ redirect: true, fallback: "/login" });
          } else {
            toast.error(mfaStatus.error || "Authentication verification failed");
          }
        } catch (err: unknown) {
          const e = err as { type?: string; code?: number; message?: string };
          if (
            e?.type === "user_more_factors_required" ||
            (e?.code === 401 && e?.message?.includes("more factors")) ||
            e?.message?.includes("More factors are required") ||
            e?.message?.includes("user_more_factors_required")
          ) {
            onClose();
            router.replace("/twofa/access");
          } else {
            toast.error(e?.message || "Login failed");
          }
        }
      } else if (mode === "otp") {
        try {
          await completeEmailOtp(formData.userId, formData.otp);
          const mfaStatus = await getMfaAuthenticationStatus();
          if (mfaStatus.needsMfa) {
            onClose();
            router.replace("/twofa/access");
          } else if (mfaStatus.isFullyAuthenticated) {
            const { finalizeAuth } = (
              await import("@/lib/finalizeAuth")
            ).useFinalizeAuth();
            await finalizeAuth({ redirect: true, fallback: "/login" });
          } else {
            toast.error(mfaStatus.error || "Authentication verification failed");
          }
        } catch (err: unknown) {
          const e = err as { type?: string; code?: number; message?: string };
          if (
            e?.type === "user_more_factors_required" ||
            (e?.code === 401 && e?.message?.includes("more factors")) ||
            e?.message?.includes("More factors are required") ||
            e?.message?.includes("user_more_factors_required")
          ) {
            onClose();
            router.replace("/twofa/access");
          } else {
            toast.error(e?.message || "Invalid OTP.");
          }
        }
      }
    }
  };

  const handleSendOTP = async () => {
    try {
      const resp = await sendEmailOtp(formData.email, true);
      setOtpSent(true);
      setSecurityPhrase(resp.phrase || "");
      setFormData((f) => ({ ...f, userId: resp.userId }));
      const key = authType === "login" ? "otp_last_" : "register_otp_last_";
      localStorage.setItem(key + formData.email, Date.now().toString());
      setOtpCooldown(OTP_COOLDOWN);
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast.error(err?.message || "Error sending OTP.");
    }
  };

  const modeButtons = [
    { label: "Password", value: "password", icon: KeyRound },
    { label: "OTP", value: "otp", icon: Mail },
  ] as const;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm">
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl relative bg-background">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-accent"
        >
          <X className="h-4 w-4" />
        </button>
        
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img
              src="/images/logo.png"
              alt="Whisperrauth Logo"
              className="h-12 w-12 rounded-lg object-contain"
            />
          </div>
          <CardTitle className="text-2xl">
            {authType === "login" ? "Welcome back" : "Create account"}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {authType === "login"
              ? "Sign in to your Whisperrauth account"
              : "Start securing your passwords today"}
          </p>
        </CardHeader>
        
        <CardContent>
          {/* Mode Switcher */}
          <div className="flex justify-center gap-2 mb-6">
            {modeButtons.map((btn) => (
              <button
                key={btn.value}
                className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-md transition-all duration-150
                  ${
                    mode === btn.value
                      ? "bg-primary text-white scale-105"
                      : "bg-white/60 text-[rgb(141,103,72)] hover:bg-primary/20"
                  }`}
                style={{
                  boxShadow:
                    mode === btn.value
                      ? "0 4px 16px 0 rgba(141,103,72,0.13)"
                      : "0 2px 8px 0 rgba(191,174,153,0.10)",
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
            {/* Name field for register */}
            {authType === "register" && (
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
            )}
            
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
              />
            </div>
            
            {/* Password fields */}
            {mode === "password" && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Password</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder={
                        authType === "login"
                          ? "Enter your password"
                          : "Create a strong password"
                      }
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
                
                {authType === "register" && (
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
                )}
              </>
            )}
            
            {/* OTP fields */}
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
                    className="glass"
                    disabled={!formData.email || otpCooldown > 0 || loading}
                    onClick={handleSendOTP}
                  >
                    {otpSent ? (
                      <Check className="h-5 w-5 text-green-600" />
                    ) : (
                      "Get OTP"
                    )}
                  </Button>
                </div>
                
                {securityPhrase && otpSent && (
                  <div className="text-xs text-muted-foreground mt-1">
                    <span className="font-semibold">Security Phrase:</span>{" "}
                    {securityPhrase}
                  </div>
                )}
                
                {otpCooldown > 0 && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Request again in {otpCooldown}s
                  </div>
                )}
              </>
            )}
            
            {/* Submit button */}
            {(mode === "password" || (mode === "otp" && otpSent)) && (
              <Button type="submit" className="w-full" disabled={loading}>
                {loading
                  ? authType === "login"
                    ? "Signing In..."
                    : "Creating..."
                  : authType === "login"
                    ? "Sign In"
                    : "Create Account"}
              </Button>
            )}
          </form>
          
          <div className="mt-6 text-center space-y-2">
            {authType === "login" && (
              <a
                href="/reset-password"
                className="text-sm text-primary hover:underline block"
              >
                Forgot your password?
              </a>
            )}
            <p className="text-sm text-muted-foreground">
              {authType === "login" ? (
                <>
                  Don&apos;t have an account?{" "}
                  <button
                    onClick={() => setAuthType("register")}
                    className="text-primary hover:underline"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    onClick={() => setAuthType("login")}
                    className="text-primary hover:underline"
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>
          </div>
        </CardContent>
      </Card>
        </div>
      </div>
    </div>
  );
}
