"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  appwriteAccount,
  loginWithEmailPassword,
  registerWithEmailPassword,
  sendEmailOtp,
  completeEmailOtp,
  resetMasterpassAndWipe,
  hasMasterpass,
  logoutAppwrite,
} from "@/lib/appwrite";
import { masterPassCrypto } from "./(protected)/masterpass/logic";
import { logDebug, logWarn } from "@/lib/logger";

// Types
import type { Models } from "appwrite";

interface AppwriteContextType {
  user: Models.User<Models.Preferences> | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAuthReady: boolean;
  isVaultUnlocked: () => boolean;
  needsMasterPassword: boolean;
  logout: () => Promise<void>;
  resetMasterpass: () => Promise<void>;
  refresh: () => Promise<void>;
  loginWithEmailPassword: (
    email: string,
    password: string,
  ) => Promise<Models.Session>;
  registerWithEmailPassword: (
    email: string,
    password: string,
    name?: string,
  ) => Promise<Models.User<Models.Preferences>>;
  sendEmailOtp: (
    email: string,
    enablePhrase?: boolean,
  ) => Promise<Models.Token>;
  completeEmailOtp: (userId: string, otp: string) => Promise<Models.Session>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (
    userId: string,
    secret: string,
    password: string,
    passwordAgain: string,
  ) => Promise<void>;
}

const AppwriteContext = createContext<AppwriteContextType | undefined>(
  undefined,
);

export function AppwriteProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [needsMasterPassword, setNeedsMasterPassword] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const verbose = process.env.NODE_ENV === "development";

  // Fetch current user and check master password status
  const fetchUser = async () => {
    setLoading(true);
    try {
      const account = await appwriteAccount.get();
      setUser(account);

      if (verbose) logDebug("[auth] account.get success", { hasAccount: !!account });

      // Check if user needs master password
      if (account) {
        const hasMp = await hasMasterpass(account.$id);
        const unlocked = masterPassCrypto.isVaultUnlocked();
        if (verbose)
          logDebug("[auth] master password status", { hasMasterpass: hasMp, unlocked });
        setNeedsMasterPassword(!hasMp || !unlocked);
      } else {
        setNeedsMasterPassword(false);
      }
    } catch (e) {
      if (verbose) logWarn("[auth] account.get error", { error: e });
      setUser(null);
      setNeedsMasterPassword(false);
    }
    setLoading(false);
    setIsAuthReady(true);
  };

  useEffect(() => {
    fetchUser();

    // Listen for vault lock events
    const handleVaultLocked = () => {
      setTimeout(() => setNeedsMasterPassword(true), 0);
    };
    window.addEventListener("vault-locked", handleVaultLocked);

    // Listen for storage changes (multi-tab logout)
    const handleStorageChange = () => fetchUser();
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("vault-locked", handleVaultLocked);
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
    if (verbose) logDebug("[auth] vault unlock status", { unlocked });
    return unlocked;
  };

  // AUTH FUNCTIONS
  const loginWithEmailPasswordFn = async (
    email: string,
    password: string,
  ): Promise<Models.Session> => {
    const result = await loginWithEmailPassword(email, password);
    await refresh();
    return result;
  };

  const registerWithEmailPasswordFn = async (
    email: string,
    password: string,
    name?: string,
  ): Promise<Models.User<Models.Preferences>> => {
    const result = await registerWithEmailPassword(email, password, name);
    await refresh();
    return result;
  };

  const completeEmailOtpFn = async (
    userId: string,
    otp: string,
  ): Promise<Models.Session> => {
    const result = await completeEmailOtp(userId, otp);
    await refresh();
    return result;
  };

  // Password reset flow (from old provider)
  const forgotPassword = async (email: string) => {
    // Assumes you have a getRedirectUrl util
    const getRedirectUrl = () => window.location.origin + "/login";
    await appwriteAccount.createRecovery(email, getRedirectUrl());
  };

  const resetPassword = async (
    userId: string,
    secret: string,
    password: string,
    _passwordAgain: string,
  ) => {
    await appwriteAccount.updateRecovery(userId, secret, password);
    await fetchUser();
  };

  return (
    <AppwriteContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        isAuthReady,
        isVaultUnlocked,
        needsMasterPassword,
        logout,
        resetMasterpass,
        refresh,
        loginWithEmailPassword: loginWithEmailPasswordFn,
        registerWithEmailPassword: registerWithEmailPasswordFn,
        sendEmailOtp,
        completeEmailOtp: completeEmailOtpFn,
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
