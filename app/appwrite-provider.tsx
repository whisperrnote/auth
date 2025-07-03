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
  // Add more as needed (CRUD, TOTP, etc)
}

const AppwriteContext = createContext<AppwriteContextType | undefined>(undefined);

export function AppwriteProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppwriteUser | null>(null);
  const [loading, setLoading] = useState(true);

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
