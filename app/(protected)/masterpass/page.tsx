"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Shield } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useAppwrite } from "@/app/appwrite-provider";
import { masterPassCrypto } from "./logic";

export default function MasterPassPage() {
  const [masterPassword, setMasterPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError<string | null>(null); // Fix the syntax error
  const [isFirstTime, setIsFirstTime] = useState<boolean | null>(null);
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const { user, secureDb, userCollectionId } = useAppwrite();
  const router = useRouter();

  // Check masterpass status from database
  useEffect(() => {
    if (!user || !secureDb || !userCollectionId) return;
    setLoading(true);
    // Try to fetch user doc and check masterpass flag
    secureDb
      .listDocuments(userCollectionId, [`equal("userId","${user.$id}")`])
      .then((res: any) => {
        const doc = res.documents?.[0];
        if (doc && doc.masterpass === true) {
          setIsFirstTime(false);
        } else {
          setIsFirstTime(true);
        }
      })
      .catch(() => setIsFirstTime(true))
      .finally(() => setLoading(false));
  }, [user, secureDb, userCollectionId]);

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
        // Mark as setup complete in DB
        // Try to find user doc, update or create
        const userDocRes = await secureDb.listDocuments(userCollectionId, [`equal("userId","${user?.$id || ""}")`]);
        if (userDocRes.documents?.length > 0) {
          await secureDb.updateDocument(
            userCollectionId,
            userDocRes.documents[0].$id,
            { masterpass: true }
          );
        } else if (user) {
          await secureDb.createDocument(
            userCollectionId,
            undefined,
            {
              userId: user.$id,
              email: user.email,
              masterpass: true,
            }
          );
        }
      }

      // Attempt to unlock vault
      const success = await masterPassCrypto.unlock(masterPassword, user?.$id || '');
      
      if (success) {
        // Redirect back to intended page or dashboard
        const returnTo = sessionStorage.getItem('masterpass_return_to') || '/dashboard';
        sessionStorage.removeItem('masterpass_return_to');
        router.replace(returnTo);
      } else {
        setError("Invalid master password");
      }
    } catch (err) {
      setError("Failed to unlock vault");
    }
    
    setLoading(false);
  };

  const handleLogout = () => {
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

            {isFirstTime && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Confirm Master Password</label>
                <Input
                  type="password"
                  placeholder="Confirm your master password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
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

          <div className="mt-6 text-center">
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Logout from Account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
