"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  appwriteAccount,
  loginWithEmailPassword,
  registerWithEmailPassword,
  sendEmailOtp,
  completeEmailOtp,
  sendMagicUrl,
  completeMagicUrl,
  resetMasterpassAndWipe,
  hasMasterpass,
  logoutAppwrite,
  ID,
} from "@/lib/appwrite";
import { masterPassCrypto } from "./(protected)/masterpass/logic";

// Types
interface AppwriteUser {
  $id: string;
  email: string;
  name?: string;
  [key: string]: any;
}

interface AppwriteContextType {
  user: AppwriteUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  isVaultUnlocked: () => boolean;
  needsMasterPassword: boolean;
  logout: () => Promise<void>;
  resetMasterpass: () => Promise<void>;
  refresh: () => Promise<void>;
  loginWithEmailPassword: (email: string, password: string) => Promise<any>;
  registerWithEmailPassword: (email: string, password: string, name?: string) => Promise<any>;
  sendEmailOtp: (email: string, enablePhrase?: boolean) => Promise<any>;
  completeEmailOtp: (userId: string, otp: string) => Promise<any>;
  sendMagicUrl: (email: string, redirectUrl: string) => Promise<any>;
  completeMagicUrl: (userId: string, secret: string) => Promise<any>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (userId: string, secret: string, password: string, passwordAgain: string) => Promise<void>;
}

const AppwriteContext = createContext<AppwriteContextType | undefined>(undefined);

export function AppwriteProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppwriteUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsMasterPassword, setNeedsMasterPassword] = useState(false);

  // Fetch current user and check master password status
  const fetchUser = async () => {
    setLoading(true);
    try {
      const account = await appwriteAccount.get();
      setUser(account);

      // Check if user needs master password
      if (account) {
        const hasMp = await hasMasterpass(account.$id);
        setNeedsMasterPassword(!hasMp || !masterPassCrypto.isVaultUnlocked());
      }
    } catch {
      setUser(null);
      setNeedsMasterPassword(false);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUser();

    // Listen for vault lock events
    const handleVaultLocked = () => {
      setNeedsMasterPassword(true);
    };
    window.addEventListener('vault-locked', handleVaultLocked);

    // Listen for storage changes (multi-tab logout)
    const handleStorageChange = () => fetchUser();
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener('vault-locked', handleVaultLocked);
      window.removeEventListener("storage", handleStorageChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = async () => {
    await fetchUser();
  };

  const logout = async () => {
    await logoutAppwrite();
    masterPassCrypto.lock();
    setUser(null);
    setNeedsMasterPassword(false);
  };

  const resetMasterpass = async () => {
    if (!user) return;
    await resetMasterpassAndWipe(user.$id);
    masterPassCrypto.lock();
    setNeedsMasterPassword(true);
  };

  const isVaultUnlocked = () => {
    const unlocked = masterPassCrypto.isVaultUnlocked();
    console.log('Vault unlock status:', unlocked);
    return unlocked;
  };

  // AUTH FUNCTIONS
  const loginWithEmailPasswordFn = async (email: string, password: string) => {
    const result = await loginWithEmailPassword(email, password);
    await refresh();
    return result;
  };

  const registerWithEmailPasswordFn = async (email: string, password: string, name?: string) => {
    const result = await registerWithEmailPassword(email, password, name);
    await refresh();
    return result;
  };

  const completeEmailOtpFn = async (userId: string, otp: string) => {
    const result = await completeEmailOtp(userId, otp);
    await refresh();
    return result;
  };

  const completeMagicUrlFn = async (userId: string, secret: string) => {
    const result = await completeMagicUrl(userId, secret);
    await refresh();
    return result;
  };

  // Password reset flow (from old provider)
  const forgotPassword = async (email: string) => {
    // Assumes you have a getRedirectUrl util
    const getRedirectUrl = () => window.location.origin + "/login";
    await appwriteAccount.createRecovery(email, getRedirectUrl());
  };

  const resetPassword = async (userId: string, secret: string, password: string, passwordAgain: string) => {
    await appwriteAccount.updateRecovery(userId, secret, password, passwordAgain);
    await fetchUser();
  };

  return (
    <AppwriteContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        isVaultUnlocked,
        needsMasterPassword,
        logout,
        resetMasterpass,
        refresh,
        loginWithEmailPassword: loginWithEmailPasswordFn,
        registerWithEmailPassword: registerWithEmailPasswordFn,
        sendEmailOtp,
        completeEmailOtp: completeEmailOtpFn,
        sendMagicUrl,
        completeMagicUrl: completeMagicUrlFn,
        forgotPassword,
        resetPassword,
      }}
    >
      {children}
    </AppwriteContext.Provider>
  );
}

// Custom hook for easy access
export function useAppwrite() {
  const ctx = useContext(AppwriteContext);
  if (!ctx) throw new Error("useAppwrite must be used within AppwriteProvider");
  return ctx;
}