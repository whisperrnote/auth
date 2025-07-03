"use client";

import { useState, useEffect, useCallback } from "react";
import { Folder, BookMarked, Layers } from "lucide-react";
import { useAppwrite } from "@/app/appwrite-provider";
import { listCredentials, searchCredentials } from "@/lib/appwrite";
import CredentialItem from "@/components/app/dashboard/CredentialItem";
import SearchBar from "@/components/app/dashboard/SearchBar";
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

export default function DashboardPage() {
  const { user } = useAppwrite();
  const [credentials, setCredentials] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const isDesktop = typeof window !== "undefined" ? window.innerWidth > 900 : true;

  // Fetch all credentials on mount
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    listCredentials(user.$id)
      .then((creds) => {
        setCredentials(creds);
        setFiltered(creds);
      })
      .finally(() => setLoading(false));
  }, [user]);

  // Fast, secure search
  const handleSearch = useCallback(
    async (term: string) => {
      setSearchTerm(term);
      if (!user) return;
      if (!term) {
        setFiltered(credentials);
      } else {
        setLoading(true);
        const results = await searchCredentials(user.$id, term);
        setFiltered(results);
        setLoading(false);
      }
    },
    [user, credentials]
  );

  // Copy handler
  const handleCopy = (value: string) => {
    navigator.clipboard.writeText(value);
  };

  return (
    <div className="w-full min-h-screen bg-[rgb(245,239,230)] flex flex-col">
      {/* Desktop AppBar */}
      <div className="hidden md:block">
        <div className="h-20 px-8 flex items-center bg-white/40 rounded-b-3xl shadow-md" style={{boxShadow: "0 8px 24px 0 rgba(141,103,72,0.13)"}}>
          <span className="font-bold text-[32px] tracking-wider text-[rgb(141,103,72)] drop-shadow-md mr-8">
            WhisperrAuth
          </span>
          <div className="flex-1">
            <SearchBar onSearch={handleSearch} />
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
            <SearchBar onSearch={handleSearch} />
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
          {loading ? (
            <div>Loading...</div>
          ) : (
            filtered.slice(0, 3).map((cred) => (
              <CredentialItem
                key={cred.$id}
                credential={cred}
                onCopy={handleCopy}
                isDesktop={isDesktop}
              />
            ))
          )}
        </div>
        {/* All Items Section */}
        <SectionTitle>All Items</SectionTitle>
        <div className="space-y-2">
          {loading ? (
            <div>Loading...</div>
          ) : (
            filtered.map((cred) => (
              <CredentialItem
                key={cred.$id}
                credential={cred}
                onCopy={handleCopy}
                isDesktop={isDesktop}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
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
