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
  APPWRITE_COLLECTION_USER_ID,
  ID,
  Query,
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
  isAuthenticated: boolean;
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
  userCollectionId: string;
  resetMasterpass: () => Promise<void>;
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

  // --- Masterpass reset logic ---
  const resetMasterpass = async () => {
    // This should be called after 2FA/email verification is successful
    // 1. Wipe all user data (credentials, totp, folders, etc)
    // 2. Optionally, wipe user doc
    // 3. Lock vault
    // 4. Optionally, log out user
    if (!user) return;
    setLoading(true);
    try {
      // Delete all user data (credentials, totp, folders)
      await Promise.all([
        secureDb.listDocuments(APPWRITE_COLLECTION_CREDENTIALS_ID, [Query.equal("userId", user.$id)]).then((res: any) =>
          Promise.all(res.documents.map((doc: any) =>
            secureDb.deleteDocument(APPWRITE_COLLECTION_CREDENTIALS_ID, doc.$id)
          ))
        ),
        secureDb.listDocuments(APPWRITE_COLLECTION_TOTPSECRETS_ID, [Query.equal("userId", user.$id)]).then((res: any) =>
          Promise.all(res.documents.map((doc: any) =>
            secureDb.deleteDocument(APPWRITE_COLLECTION_TOTPSECRETS_ID, doc.$id)
          ))
        ),
        secureDb.listDocuments(APPWRITE_COLLECTION_FOLDERS_ID, [Query.equal("userId", user.$id)]).then((res: any) =>
          Promise.all(res.documents.map((doc: any) =>
            secureDb.deleteDocument(APPWRITE_COLLECTION_FOLDERS_ID, doc.$id)
          ))
        ),
        secureDb.listDocuments(APPWRITE_COLLECTION_SECURITYLOGS_ID, [Query.equal("userId", user.$id)]).then((res: any) =>
          Promise.all(res.documents.map((doc: any) =>
            secureDb.deleteDocument(APPWRITE_COLLECTION_SECURITYLOGS_ID, doc.$id)
          ))
        ),
        // Optionally, delete user doc
        secureDb.listDocuments(APPWRITE_COLLECTION_USER_ID, [Query.equal("userId", user.$id)]).then((res: any) =>
          Promise.all(res.documents.map((doc: any) =>
            secureDb.deleteDocument(APPWRITE_COLLECTION_USER_ID, doc.$id)
          ))
        ),
      ]);
      // Lock vault and clear session
      masterPassCrypto.lock();
      setIsApplicationLocked(true);
      setUser(null);
      // Optionally, log out user
      await appwriteAccount.deleteSession("current");
    } catch (err) {
      // Handle error if needed
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
        isAuthenticated: !!user,
        login,
        logout,
        register,
        refresh,
        secureDb,
        isVaultUnlocked,
        lockVault,
        lockApplication,
        isApplicationLocked,
        userCollectionId: APPWRITE_COLLECTION_USER_ID,
        resetMasterpass,
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
