"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Menu, Moon, Sun, Monitor, User } from "lucide-react";
import { useTheme } from "@/app/providers";
import { useAppwrite } from "@/app/appwrite-provider";
import { Button } from "@/components/ui/Button";
import { DropdownMenu } from "@/components/ui/DropdownMenu";

// Pages that should use the simplified layout (no sidebar/header)
const SIMPLIFIED_LAYOUT_PATHS = ['/', '/login', '/register', '/forgot-password'];

interface HeaderProps {
  onMenuClick: () => void;
  sidebarOpen: boolean;
}

export function Header({ onMenuClick, sidebarOpen }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAppwrite();
  const pathname = usePathname();
  
  // Don't render the header on simplified layout pages
  if (SIMPLIFIED_LAYOUT_PATHS.includes(pathname)) {
    return null;
  }

  const themeOptions = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ] as const;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onMenuClick}
            className="lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center gap-2">
            {/* Replace PM with logo */}
            <img
              src="/images/logo.png"
              alt="Whisperrauth Logo"
              className="h-8 w-8 rounded-lg object-contain"
            />
            <h1 className="font-semibold text-lg hidden sm:block">Whisperrauth</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const nextTheme =
                theme === "light"
                  ? "dark"
                  : theme === "dark"
                  ? "system"
                  : "light";
              setTheme(nextTheme);
            }}
          >
            {theme === "light" && <Sun className="h-4 w-4" />}
            {theme === "dark" && <Moon className="h-4 w-4" />}
            {theme === "system" && <Monitor className="h-4 w-4" />}
          </Button>

          <DropdownMenu
            trigger={
              <Button variant="ghost" size="sm">
                <User className="h-4 w-4" />
              </Button>
            }
          >
            <div className="flex flex-col px-3 py-2 bg-background shadow-lg rounded-md border border-border">
              <span className="font-medium">{user?.name || user?.email}</span>
              <span className="text-xs text-muted-foreground">{user?.email}</span>
            </div>
            <hr className="my-1 border-border" />
            <Link href="/settings">
              <button className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent rounded-md">
                Settings
              </button>
            </Link>
            <button
              className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent rounded-md text-destructive"
              onClick={logout}
            >
              Logout
            </button>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
