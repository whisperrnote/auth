"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { appwriteAccount, ID } from "@/lib/appwrite";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// --- Appwrite Auth Context ---
interface User {
  $id: string;
  email: string;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  sendMagicLink: (email: string, url: string) => Promise<void>;
  sendOTP: (email: string, usePhrase?: boolean) => Promise<void>;
  verifyOTP: (userId: string, secret: string) => Promise<void>;
  refresh: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (userId: string, secret: string, password: string, passwordAgain: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AppwriteProvider");
  return context;
}

function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_BASE_URL) {
    return process.env.NEXT_PUBLIC_APP_BASE_URL;
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "";
}

function getRedirectUrl() {
  return getBaseUrl() + "/login";
}

export function AppwriteProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch current user on mount
  const fetchUser = async () => {
    setLoading(true);
    try {
      const account = await appwriteAccount.get();
      setUser(account as User);
    } catch {
      setUser(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUser();
    // Listen to storage/session changes for multi-tab logout
    const handler = () => fetchUser();
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const login = async (email: string, password: string) => {
    await appwriteAccount.createEmailPasswordSession(email, password);
    await fetchUser();
  };

  const register = async (email: string, password: string, name?: string) => {
    await appwriteAccount.create(ID.unique(), email, password, name);
    await login(email, password);
  };

  const logout = async () => {
    await appwriteAccount.deleteSession("current");
    setUser(null);
  };

  const sendMagicLink = async (email: string, url: string) => {
    await appwriteAccount.updateMagicURLSession(ID.unique(), email, url);
  };

  const sendOTP = async (email: string, usePhrase: boolean = false) => {
    await appwriteAccount.createEmailToken(ID.unique(), email, usePhrase);
  };

  const verifyOTP = async (userId: string, secret: string) => {
    await appwriteAccount.createSession(userId, secret);
    await fetchUser();
  };

  const refresh = async () => {
    await fetchUser();
  };

  const forgotPassword = async (email: string) => {
    await appwriteAccount.createRecovery(email, getRedirectUrl());
  };

  const resetPassword = async (userId: string, secret: string, password: string, passwordAgain: string) => {
    await appwriteAccount.updateRecovery(userId, secret, password, passwordAgain);
    await fetchUser();
  };

  return (
    <AuthContext.Provider value={{
      user, loading, login, register, logout, sendMagicLink, sendOTP, verifyOTP, refresh,
      forgotPassword, resetPassword
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// --- Theme Provider (unchanged) ---
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("theme") as Theme;
    if (stored) setTheme(stored);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem("theme", theme);
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme, mounted]);

  if (!mounted) return null;

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <AppwriteProvider>
        {children}
      </AppwriteProvider>
    </ThemeContext.Provider>
  );
}
//       <AppwriteProvider>
//         {children}
//       </AppwriteProvider>
//     </ThemeContext.Provider>
//   );
// }
