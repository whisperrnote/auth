"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  appwriteAccount,
  appwriteDatabases,
  APPWRITE_DATABASE_ID,
  APPWRITE_COLLECTION_CREDENTIALS_ID,
  APPWRITE_COLLECTION_TOTPSECRETS_ID,
  APPWRITE_COLLECTION_FOLDERS_ID,
  APPWRITE_COLLECTION_SECURITYLOGS_ID,
  ID,
} from "@/lib/appwrite";
import { masterPassCrypto, createSecureDbWrapper } from "./(protected)/masterpass/logic";

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
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  refresh: () => Promise<void>;
  // Secure database access
  secureDb: any;
  isVaultUnlocked: () => boolean;
  lockVault: () => void;
  lockApplication: () => void;
  isApplicationLocked: boolean;
}

const AppwriteContext = createContext<AppwriteContextType | undefined>(undefined);

export function AppwriteProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppwriteUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [secureDb, setSecureDb] = useState<any>(null);
  const [isApplicationLocked, setIsApplicationLocked] = useState(false);

  // Fetch current user on mount
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const account = await appwriteAccount.get();
        setUser(account);
      } catch {
        setUser(null);
      }
      setLoading(false);
    })();
  }, []);

  // Initialize secure database wrapper
  useEffect(() => {
    const wrapper = createSecureDbWrapper(appwriteDatabases, APPWRITE_DATABASE_ID);
    setSecureDb(wrapper);
  }, []);

  // Listen for vault lock events
  useEffect(() => {
    const handleVaultLocked = () => {
      setIsApplicationLocked(true);
    };

    window.addEventListener('vault-locked', handleVaultLocked);
    return () => window.removeEventListener('vault-locked', handleVaultLocked);
  }, []);

  // Auth functions
  const login = async (email: string, password: string) => {
    setLoading(true);
    await appwriteAccount.createEmailPasswordSession(email, password);
    const account = await appwriteAccount.get();
    setUser(account);
    setLoading(false);
  };

  const logout = async () => {
    setLoading(true);
    await appwriteAccount.deleteSession("current");
    setUser(null);
    setLoading(false);
  };

  const register = async (email: string, password: string, name?: string) => {
    setLoading(true);
    await appwriteAccount.create(ID.unique(), email, password, name);
    await login(email, password);
    setLoading(false);
  };

  const refresh = async () => {
    setLoading(true);
    try {
      const account = await appwriteAccount.get();
      setUser(account);
    } catch {
      setUser(null);
    }
    setLoading(false);
  };

  const lockVault = () => {
    masterPassCrypto.lock();
  };

  const isVaultUnlocked = () => {
    return masterPassCrypto.isVaultUnlocked();
  };

  const lockApplication = () => {
    masterPassCrypto.lockApplication();
    setIsApplicationLocked(true);
  };

  // Add more methods for credentials, totp, folders, logs, etc as needed

  return (
    <AppwriteContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        register,
        refresh,
        secureDb,
        isVaultUnlocked,
        lockVault,
        lockApplication,
        isApplicationLocked,
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
