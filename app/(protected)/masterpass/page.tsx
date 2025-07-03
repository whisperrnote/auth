"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Shield } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useAppwrite } from "@/app/appwrite-provider";
import { masterPassCrypto, updateMasterpassCheckValue } from "./logic";
import { hasMasterpass, setMasterpassFlag, logoutAppwrite } from "@/lib/appwrite";

export default function MasterPassPage() {
  const [masterPassword, setMasterPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFirstTime, setIsFirstTime] = useState<boolean | null>(null);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [confirmCapsLock, setConfirmCapsLock] = useState(false);
  
  const { user, refresh } = useAppwrite();
  const router = useRouter();

  // Check masterpass status from database
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    hasMasterpass(user.$id)
      .then((present) => setIsFirstTime(!present))
      .catch(() => setIsFirstTime(true))
      .finally(() => setLoading(false));
  }, [user]);

  // Redirect to login if not logged in
  useEffect(() => {
    if (user === null && !loading) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isFirstTime) {
        // First time setup - validate confirmation
        if (masterPassword !== confirmPassword) {
          setError("Passwords don't match");
          setLoading(false);
          return;
        }
        if (masterPassword.length < 8) {
          setError("Master password must be at least 8 characters");
          setLoading(false);
          return;
        }
        // Mark as setup complete in DB (modular logic)
        if (user) {
          await setMasterpassFlag(user.$id, user.email);
        }
      }

      // Attempt to unlock vault
      const success = await masterPassCrypto.unlock(masterPassword, user?.$id || '');
      
      if (success) {
        // Update the check value after successful unlock
        if (user) {
          await updateMasterpassCheckValue(user.$id);
        }
        // Update provider state
        await refresh();
        
        // Redirect to dashboard
        router.replace('/dashboard');
      } else {
        // Show specific error for wrong password
        if (isFirstTime) {
          setError("Failed to set master password");
        } else {
          setError("Incorrect master password. Please try again.");
        }
      }
    } catch (err: any) {
      if (err.message?.includes('Vault is locked') || err.message?.includes('master password is incorrect')) {
        setError("Incorrect master password. Please try again.");
      } else {
        setError("Failed to unlock vault");
      }
    }
    
    setLoading(false);
  };

  const handleLogout = async () => {
    setLoading(true);
    await logoutAppwrite();
    setLoading(false);
    router.replace('/login');
  };

  // Loading state for DB check
  if (isFirstTime === null || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-lg text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md glass shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">
            {isFirstTime ? "Set Master Password" : "Unlock Vault"}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {isFirstTime 
              ? "Create a master password to encrypt your data"
              : "Enter your master password to access encrypted data"
            }
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {isFirstTime ? "Create Master Password" : "Master Password"}
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder={isFirstTime ? "Create a strong master password" : "Enter your master password"}
                  value={masterPassword}
                  onChange={(e) => setMasterPassword(e.target.value)}
                  required
                  autoFocus
                  onKeyDown={e => {
                    if (
                      "getModifierState" in e &&
                      (e as React.KeyboardEvent<HTMLInputElement>).getModifierState("CapsLock")
                    ) {
                      setCapsLock(true);
                    } else {
                      setCapsLock(false);
                    }
                  }}
                  onKeyUp={e => {
                    if (
                      "getModifierState" in e &&
                      (e as React.KeyboardEvent<HTMLInputElement>).getModifierState("CapsLock")
                    ) {
                      setCapsLock(true);
                    } else {
                      setCapsLock(false);
                    }
                  }}
                  onBlur={() => setCapsLock(false)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {capsLock && (
                <div className="text-xs text-yellow-700 mt-1">
                  <span className="font-semibold">Caps Lock is ON</span>
                </div>
              )}
            </div>

            {isFirstTime && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Confirm Master Password</label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your master password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    onKeyDown={e => {
                      if (
                        "getModifierState" in e &&
                        (e as React.KeyboardEvent<HTMLInputElement>).getModifierState("CapsLock")
                      ) {
                        setConfirmCapsLock(true);
                      } else {
                        setConfirmCapsLock(false);
                      }
                    }}
                    onKeyUp={e => {
                      if (
                        "getModifierState" in e &&
                        (e as React.KeyboardEvent<HTMLInputElement>).getModifierState("CapsLock")
                      ) {
                        setConfirmCapsLock(true);
                      } else {
                        setConfirmCapsLock(false);
                      }
                    }}
                    onBlur={() => setConfirmCapsLock(false)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {confirmCapsLock && (
                  <div className="text-xs text-yellow-700 mt-1">
                    <span className="font-semibold">Caps Lock is ON</span>
                  </div>
                )}
                {confirmPassword.length > 0 && (
                  <div className="text-xs mt-1">
                    {confirmPassword === masterPassword ? (
                      <span className="text-green-700">Passwords match</span>
                    ) : (
                      <span className="text-red-700">Passwords do not match</span>
                    )}
                  </div>
                )}
              </div>
            )}

            {isFirstTime && (
              <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg text-xs text-blue-800 dark:text-blue-200">
                <div className="flex items-start gap-2">
                  <Shield className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Important:</strong> Your master password encrypts all your data locally. 
                    We cannot recover it if you forget it. Please store it in a safe place.
                  </div>
                </div>
              </div>
            )}

            {error && <div className="text-red-600 text-sm">{error}</div>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                "Processing..."
              ) : isFirstTime ? (
                "Set Master Password"
              ) : (
                "Unlock Vault"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center flex flex-col gap-2">
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Logout from Account
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => router.push("/masterpass/reset")}
            >
              Reset Master Password
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}