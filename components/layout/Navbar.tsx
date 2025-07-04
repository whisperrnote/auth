"use client";

import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "@/app/providers";
import Link from "next/link";

export function Navbar() {
  const { theme, setTheme } = useTheme();

  return (
    <nav className="border-b border-border">
      <div className="max-w-screen-xl mx-auto flex justify-between items-center h-16 px-4">
        <Link href="/" className="flex items-center gap-2">
          <img
            src="/images/logo.png"
            alt="Whisperrauth Logo"
            className="h-8 w-8 rounded-lg object-contain"
          />
          <span className="font-semibold text-lg">Whisperrauth</span>
        </Link>
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
      </div>
    </nav>
  );
}