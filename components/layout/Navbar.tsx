"use client";

import { Sun, Moon, Monitor, User, LogOut } from "lucide-react";
import { useTheme } from "@/app/providers";
import Link from "next/link";
import { useAppwrite } from "@/app/appwrite-provider";
import { Button } from "@/components/ui/Button";
import { useState } from "react";

export function Navbar() {
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAppwrite();
  const [showMenu, setShowMenu] = useState(false);

  return (
    <nav className="border-b border-border">
      <div className="max-w-screen-xl mx-auto flex justify-between items-center h-16 px-4 relative">
        <Link href="/" className="flex items-center gap-2">
          <img
            src="/images/logo.png"
            alt="Whisperrauth Logo"
            className="h-8 w-8 rounded-lg object-contain"
          />
          <span className="font-semibold text-lg">Whisperrauth</span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            className="p-2 rounded-full hover:bg-accent"
            onClick={() => {
              const nextTheme =
                theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
              setTheme(nextTheme);
            }}
          >
            {theme === "light" && <Sun className="h-5 w-5" />}
            {theme === "dark" && <Moon className="h-5 w-5" />}
            {theme === "system" && <Monitor className="h-5 w-5" />}
          </button>
          {!user ? (
            <Link href="/login">
              <Button size="sm" variant="outline">
                Sign in
              </Button>
            </Link>
          ) : (
            <div className="relative">
              <Button
                size="sm"
                variant="ghost"
                className="flex items-center gap-2"
                onClick={() => setShowMenu((v) => !v)}
              >
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">{user.name || user.email}</span>
              </Button>
              {showMenu && (
                <div
                  className="absolute right-0 mt-2 w-56 bg-background border rounded-lg shadow-lg z-50"
                  onMouseLeave={() => setShowMenu(false)}
                >
                  <div className="px-4 py-3 border-b">
                    <div className="font-medium">{user.name || user.email}</div>
                    <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                  </div>
                  <Link href="/settings">
                    <button
                      className="w-full text-left px-4 py-2 hover:bg-accent text-sm"
                      onClick={() => setShowMenu(false)}
                    >
                      Account Settings
                    </button>
                  </Link>
                  <button
                    className="w-full text-left px-4 py-2 hover:bg-accent text-sm flex items-center gap-2 text-destructive"
                    onClick={async () => {
                      setShowMenu(false);
                      await logout();
                    }}
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}