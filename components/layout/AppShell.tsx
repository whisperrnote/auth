"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Shield,
  Key,
  FolderOpen,
  FileText,
  Archive,
  Settings,
  LogOut,
  Sun,
  Moon,
  Monitor,
  Home,
  Menu
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useTheme } from "@/app/providers";
import { Header } from "./Header";

const navigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Credentials", href: "/credentials", icon: Key },
  { name: "TOTP", href: "/totp", icon: Shield },
  { name: "Folders", href: "/folders", icon: FolderOpen },
  { name: "Security Logs", href: "/logs", icon: FileText },
  { name: "Backups", href: "/backups", icon: Archive },
  { name: "Settings", href: "/settings", icon: Settings },
];

// Pages that should use the simplified layout (no sidebar/header)
const SIMPLIFIED_LAYOUT_PATHS = ['/', '/login', '/register', '/forgot-password'];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  
  // Check if current page should use simplified layout
  const isSimplifiedLayout = SIMPLIFIED_LAYOUT_PATHS.includes(pathname);
  
  // Close sidebar by default on simplified layout pages
  useEffect(() => {
    if (isSimplifiedLayout) {
      setSidebarOpen(false);
    }
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

  // For all other pages, render the full application layout with sidebar
  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transform transition-transform lg:translate-x-0 lg:relative ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-2 p-6 border-b">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-xl font-bold">Whisperrauth</h1>
          </div>
          <nav className="flex-1 p-4 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent hover:text-accent-foreground"
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="h-5 w-5" />
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
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <Header onMenuClick={() => setSidebarOpen(true)} sidebarOpen={sidebarOpen} />
        {/* Page content */}
        <main className="p-6 pt-20">{children}</main>
      </div>
    </div>
  );
}





