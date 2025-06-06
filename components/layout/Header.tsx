"use client";

import { Menu, Moon, Sun, Monitor, User } from "lucide-react";
import { useTheme } from "@/app/providers";
import { Button } from "@/components/ui/Button";
import { DropdownMenu } from "@/components/ui/DropdownMenu";

interface HeaderProps {
  onMenuClick: () => void;
  sidebarOpen: boolean;
}

export function Header({ onMenuClick, sidebarOpen }: HeaderProps) {
  const { theme, setTheme } = useTheme();

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
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">PM</span>
            </div>
            <h1 className="font-semibold text-lg hidden sm:block">Password Manager</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu
            trigger={
              <Button variant="ghost" size="sm">
                {theme === "light" && <Sun className="h-4 w-4" />}
                {theme === "dark" && <Moon className="h-4 w-4" />}
                {theme === "system" && <Monitor className="h-4 w-4" />}
              </Button>
            }
          >
            {themeOptions.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={`flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent rounded-md ${
                  theme === value ? 'bg-accent' : ''
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </DropdownMenu>

          <DropdownMenu
            trigger={
              <Button variant="ghost" size="sm">
                <User className="h-4 w-4" />
              </Button>
            }
          >
            <button className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent rounded-md">
              Profile
            </button>
            <button className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent rounded-md">
              Settings
            </button>
            <hr className="my-1 border-border" />
            <button className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent rounded-md text-destructive">
              Logout
            </button>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
