"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Shield,
  Settings,
  LogOut,
  Sun,
  Moon,
  Monitor,
  Home,
  PlusCircle,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useTheme } from "@/app/providers";
import { useAppwrite } from "@/app/appwrite-provider"; // Use useAppwrite instead of useAuth
import { Header } from "./Header";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { masterPassCrypto } from "@/app/(protected)/masterpass/logic";
import { Navbar } from "./Navbar";

// Only these 5 items
const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Sharing", href: "/sharing", icon: Share2 },
  { name: "New", href: "/credentials/new", icon: PlusCircle, big: true },
  { name: "TOTP", href: "/totp", icon: Shield },
  { name: "Settings", href: "/settings", icon: Settings },
];

const SIMPLIFIED_LAYOUT_PATHS = ['/', '/login', '/register', '/forgot-password', '/masterpass', '/masterpass/reset'];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { user, loading, logout } = useAppwrite(); // Use useAppwrite instead of useAuth
  const router = useRouter();

  const isSimplifiedLayout = SIMPLIFIED_LAYOUT_PATHS.includes(pathname);

  useEffect(() => {
    if (!loading && !user && !isSimplifiedLayout) {
      router.replace("/login");
    }
  }, [loading, user, isSimplifiedLayout, router]);

  // Check for master password requirement
  useEffect(() => {
    if (user && !isSimplifiedLayout) {
      // Update activity when user interacts with protected pages
      masterPassCrypto.updateActivity();
      
      // Check if vault is unlocked
      if (!masterPassCrypto.isVaultUnlocked()) {
        // Store current path for return after unlock
        sessionStorage.setItem('masterpass_return_to', pathname);
        router.replace('/masterpass');
      }
    }
  }, [user, isSimplifiedLayout, pathname, router]);

  useEffect(() => {
    if (isSimplifiedLayout) setSidebarOpen(false);
  }, [isSimplifiedLayout]);

  const getThemeIcon = () => {
    switch (theme) {
      case "light":
        return Sun;
      case "dark":
        return Moon;
      default:
        return Monitor;
    }
  };

  const ThemeIcon = getThemeIcon();

  // If it's a simplified layout page, render without sidebar and header
  if (isSimplifiedLayout) {
    return (
      <div className="min-h-screen bg-background">
        {children}
      </div>
    );
  }

  // Don't render protected content until auth is resolved
  if (!loading && !user) {
    return null;
  }

  // Responsive: show sidebar on desktop, bottom bar on mobile
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Use Navbar instead of Header */}
      <Navbar />

      <div className="flex-1 flex w-full">
        {/* Sidebar (desktop only) */}
        <aside
          className={clsx(
            "hidden lg:flex flex-col w-64 bg-card border-r transition-transform duration-200",
            "pt-16 h-[calc(100vh-4rem)] sticky top-16"
          )}
          style={{ minHeight: "calc(100vh - 4rem)" }}
        >
          <div className="flex flex-col h-full">
            <nav className="flex-1 p-4 space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                const isBig = item.big;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={clsx(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-accent hover:text-accent-foreground",
                      isBig && "text-base py-3"
                    )}
                  >
                    <item.icon className={clsx("h-5 w-5", isBig && "h-7 w-7")} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
            <div className="p-4 border-t space-y-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-3"
                onClick={() => {
                  const themes: Array<"light" | "dark" | "system"> = [
                    "light",
                    "dark",
                    "system",
                  ];
                  const currentIndex = themes.indexOf(theme);
                  const nextTheme = themes[(currentIndex + 1) % themes.length];
                  setTheme(nextTheme);
                }}
              >
                <ThemeIcon className="h-4 w-4" />
                {theme.charAt(0).toUpperCase() + theme.slice(1)} theme
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-3 text-destructive hover:text-destructive"
                onClick={logout}
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
          {/* Page content */}
          <main className="p-6 pt-20">{children}</main>
        </div>
      </div>

      {/* Bottom bar (mobile only) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t flex lg:hidden justify-around items-center h-16 shadow-md">
        {navigation.map((item, idx) => {
          const isActive = pathname === item.href;
          const isBig = item.big;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={clsx(
                "flex flex-col items-center justify-center",
                isBig ? "scale-110" : "",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-primary"
              )}
              aria-label={item.name}
            >
              <item.icon className={clsx("mb-1", isBig ? "h-8 w-8" : "h-5 w-5")} />
              <span className={clsx("text-xs", isBig && "font-semibold")}>{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}





