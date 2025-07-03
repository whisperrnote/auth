"use client";

import { useState } from "react";
import { Search, Folder, BookMarked, Layers, Copy } from "lucide-react";
import { Button } from "@/components/ui/Button";
import clsx from "clsx";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[22px] font-bold text-[rgb(141,103,72)] mb-2 drop-shadow-sm">
      {children}
    </h2>
  );
}

function FilterChip({ label, icon: Icon }: { label: string; icon: any }) {
  return (
    <div className="flex items-center px-4 py-2 bg-white/60 rounded-full shadow-sm border border-[rgba(191,174,153,0.4)] mr-3 mb-2">
      <Icon className="h-5 w-5 text-[rgb(141,103,72)]" />
      <span className="ml-2 text-[rgb(141,103,72)] font-semibold text-[15px]">{label}</span>
    </div>
  );
}

function PasswordItem({
  username,
  hash,
  isDesktop,
}: {
  username: string;
  hash: string;
  isDesktop: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div
      className={clsx(
        "rounded-2xl overflow-hidden mb-3 backdrop-blur-md border border-[rgba(191,174,153,0.3)] shadow-sm",
        "bg-white/55 transition-shadow hover:shadow-lg"
      )}
      style={{ boxShadow: "0 4px 12px 0 rgba(141,103,72,0.10)" }}
    >
      <div className="flex items-center px-4 py-3">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-[rgba(191,174,153,0.7)] flex items-center justify-center">
            <span>
              <svg width="24" height="24" fill="none">
                <circle cx="12" cy="12" r="12" fill="#BFAE99" />
                <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-3.31 0-6 1.34-6 3v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-1c0-1.66-2.69-3-6-3Z" fill="#8D6748"/>
              </svg>
            </span>
          </div>
        </div>
        <div className="flex-1 ml-4">
          <div className="font-semibold text-[rgb(141,103,72)]">{username}</div>
          <div className="text-[13px] font-mono text-[rgb(191,174,153)]">{hash}</div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={handleCopy}
            aria-label="Copy"
          >
            <Copy className="h-5 w-5 text-[rgb(141,103,72)]" />
          </Button>
          {isDesktop && (
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={handleCopy}
              aria-label="Copy"
            >
              <Copy className="h-5 w-5 text-[rgb(141,103,72)]" />
            </Button>
          )}
        </div>
        {copied && (
          <span className="ml-2 text-xs text-green-600 animate-fade-in-out">Copied!</span>
        )}
      </div>
    </div>
  );
}

function SearchBar() {
  return (
    <div className="rounded-full overflow-hidden backdrop-blur-md shadow-sm border border-[rgba(191,174,153,0.4)] bg-white/45 flex items-center h-11 px-4">
      <Search className="text-[rgb(141,103,72)] w-5 h-5" />
      <input
        className="flex-1 ml-2 bg-transparent outline-none text-base"
        placeholder="Search passwords, usernames..."
        type="text"
      />
    </div>
  );
}

export default function DashboardPage() {
  // Responsive: use window.innerWidth or a media query hook for isDesktop
  const isDesktop = typeof window !== "undefined" ? window.innerWidth > 900 : true;

  return (
    <div className="w-full min-h-screen bg-[rgb(245,239,230)] flex flex-col">
      {/* Desktop AppBar */}
      <div className="hidden md:block">
        <div className="h-20 px-8 flex items-center bg-white/40 rounded-b-3xl shadow-md" style={{boxShadow: "0 8px 24px 0 rgba(141,103,72,0.13)"}}>
          <span className="font-bold text-[32px] tracking-wider text-[rgb(141,103,72)] drop-shadow-md mr-8">
            WhisperrAuth
          </span>
          <div className="flex-1">
            <SearchBar />
          </div>
        </div>
      </div>
      {/* Mobile AppBar */}
      <div className="md:hidden">
        <div className="h-[70px] flex items-center justify-center bg-white/70 shadow-md relative">
          <span className="font-bold text-[26px] tracking-wider text-[rgb(141,103,72)] drop-shadow-md">
            WhisperrAuth
          </span>
          <div className="absolute left-0 right-0 bottom-0 px-2 pb-2">
            <SearchBar />
          </div>
        </div>
      </div>
      {/* Main Content */}
      <div className="flex-1 w-full max-w-4xl mx-auto px-4 md:px-8 py-6">
        {/* Filter chips */}
        <div className="flex flex-wrap items-center py-4">
          <FilterChip label="Folder" icon={Folder} />
          <FilterChip label="Collection" icon={BookMarked} />
          <FilterChip label="Kind" icon={Layers} />
        </div>
        {/* Recent Section */}
        <SectionTitle>Recent</SectionTitle>
        <div className="space-y-2 mb-6">
          {[1, 2, 3].map((i) => (
            <PasswordItem
              key={i}
              username={`user${i}@mail.com`}
              hash="a1b2c3d4e5f6g7h8i9j0"
              isDesktop={isDesktop}
            />
          ))}
        </div>
        {/* All Items Section */}
        <SectionTitle>All Items</SectionTitle>
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <PasswordItem
              key={i}
              username={`demo${i + 1}@site.com`}
              hash={`z9y8x7w6v5u4t3s2r1q${i + 1}`}
              isDesktop={isDesktop}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
