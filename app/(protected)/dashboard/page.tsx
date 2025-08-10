"use client";

import { useState, useEffect, useCallback } from "react";
import { Folder, BookMarked, Layers } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAppwrite } from "@/app/appwrite-provider";
import { createCredential, updateCredential, deleteCredential, listCredentials, searchCredentials } from "@/lib/appwrite";
import CredentialItem from "@/components/app/dashboard/CredentialItem";
import SearchBar from "@/components/app/dashboard/SearchBar";
import CredentialDialog from "@/components/app/dashboard/CredentialDialog";
import clsx from "clsx";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[22px] font-bold text-[rgb(141,103,72)] dark:text-primary mb-2 drop-shadow-sm">
      {children}
    </h2>
  );
}

function FilterChip({ label, icon: Icon }: { label: string; icon: any }) {
  return (
    <div className="flex items-center px-4 py-2 bg-white/60 dark:bg-neutral-800 rounded-full shadow-sm border border-[rgba(191,174,153,0.4)] dark:border-neutral-700 mr-3 mb-2">
      <Icon className="h-5 w-5 text-[rgb(141,103,72)]" />
      <span className="ml-2 text-[rgb(141,103,72)] dark:text-primary font-semibold text-[15px]">{label}</span>
    </div>
  );
}

import VaultGuard from "@/components/layout/VaultGuard";

export default function DashboardPage() {
  const { user } = useAppwrite();
  const [credentials, setCredentials] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editCredential, setEditCredential] = useState<any | null>(null);
  const isDesktop = typeof window !== "undefined" ? window.innerWidth > 900 : true;

  // Fetch all credentials on mount
  useEffect(() => {
    if (!user?.$id) return;
    setLoading(true);
    listCredentials(user.$id)
      .then((creds) => {
        setCredentials(creds);
        setFiltered(creds);
      })
      .catch((error) => {
        console.error('Failed to load credentials:', error);
      })
      .finally(() => setLoading(false));
  }, [user]);

  // Fast, secure search
  const handleSearch = useCallback(
    async (term: string) => {
      setSearchTerm(term);
      if (!user?.$id) return;
      if (!term) {
        setFiltered(credentials);
      } else {
        setLoading(true);
        try {
          const results = await searchCredentials(user.$id, term);
          setFiltered(results);
        } catch (error) {
          console.error('Search failed:', error);
        } finally {
          setLoading(false);
        }
      }
    },
    [user, credentials]
  );

  // Copy handler
  const handleCopy = (value: string) => {
    navigator.clipboard.writeText(value);
  };

  // Add new credential
  const handleAdd = () => {
    setEditCredential(null);
    setShowDialog(true);
  };

  // Edit credential
  const handleEdit = (cred: any) => {
    setEditCredential(cred);
    setShowDialog(true);
  };

  // Delete credential
  const handleDelete = async (cred: any) => {
    if (!user?.$id) return;
    if (!window.confirm("Delete this credential?")) return;
    setLoading(true);
    try {
      await deleteCredential(cred.$id);
      const creds = await listCredentials(user.$id);
      setCredentials(creds);
      setFiltered(creds);
    } catch (error) {
      console.error('Failed to delete credential:', error);
    } finally {
      setLoading(false);
    }
  };

  // Refresh credentials after add/edit
  const refreshCredentials = async () => {
    if (!user?.$id) return;
    setLoading(true);
    try {
      const creds = await listCredentials(user.$id);
      setCredentials(creds);
      setFiltered(creds);
    } catch (error) {
      console.error('Failed to refresh credentials:', error);
    } finally {
      setLoading(false);
    }
  };

  // Don't render if user is not available
  if (!user) {
    return (
      <div className="w-full min-h-screen bg-background dark:bg-neutral-900 flex items-center justify-center">
        <div className="text-lg text-muted-foreground dark:text-foreground">Loading...</div>
      </div>
    );
  }

   return (
    <VaultGuard>
  {/* Ensures dark mode is inherited for all children */}
      {/* Main Dashboard Content */}
      <div className="w-full min-h-screen bg-background dark:bg-neutral-900 flex flex-col">
        {/* Desktop AppBar */}
        <div className="hidden md:block">
          <div className="h-20 px-8 flex items-center bg-white/40 dark:bg-neutral-800/80 rounded-b-3xl shadow-md" style={{boxShadow: "0 8px 24px 0 rgba(141,103,72,0.13)"}}>
            <span className="font-bold text-[32px] tracking-wider text-[rgb(141,103,72)] dark:text-primary drop-shadow-md mr-8">
              WhisperrAuth
            </span>
            <div className="flex-1">
              <SearchBar onSearch={handleSearch} />
            </div>
          </div>
        </div>
        {/* Mobile AppBar */}
        <div className="md:hidden">
          <div className="h-[70px] flex items-center justify-center bg-white/70 dark:bg-neutral-800/80 shadow-md relative">
            <span className="font-bold text-[26px] tracking-wider text-[rgb(141,103,72)] dark:text-primary drop-shadow-md">
              WhisperrAuth
            </span>
            <div className="absolute left-0 right-0 bottom-0 px-2 pb-2">
              <SearchBar onSearch={handleSearch} />
            </div>
          </div>
        </div>
        {/* Main Content */}
        <div className="flex-1 w-full max-w-4xl mx-auto px-4 md:px-8 py-6 bg-background dark:bg-neutral-900 rounded-lg shadow">
          {/* Filter chips */}
          <div className="flex flex-wrap items-center py-4">
            <FilterChip label="Folder" icon={Folder} />
            <FilterChip label="Collection" icon={BookMarked} />
            <FilterChip label="Kind" icon={Layers} />
          </div>
          <div className="flex justify-end mb-4">
            <Button onClick={handleAdd}>+ Add Password</Button>
          </div>
          {/* Recent Section */}
          <SectionTitle>Recent</SectionTitle>
          <div className="space-y-2 mb-6 text-foreground dark:text-foreground">
            {loading ? (
              <div className="text-foreground dark:text-foreground">Loading...</div>
            ) : (
              filtered.slice(0, 3).map((cred) => (
                <CredentialItem
                  key={cred.$id}
                  credential={cred}
                  onCopy={handleCopy}
                  isDesktop={isDesktop}
                  onEdit={() => handleEdit(cred)}
                  onDelete={() => handleDelete(cred)}
                />
              ))
            )}
          </div>
          {/* All Items Section */}
          <SectionTitle>All Items</SectionTitle>
          <div className="space-y-2 text-foreground dark:text-foreground">
            {loading ? (
              <div className="text-foreground dark:text-foreground">Loading...</div>
            ) : (
              filtered.map((cred) => (
                <CredentialItem
                  key={cred.$id}
                  credential={cred}
                  onCopy={handleCopy}
                  isDesktop={isDesktop}
                  onEdit={() => handleEdit(cred)}
                  onDelete={() => handleDelete(cred)}
                />
              ))
            )}
          </div>
        </div>
        <CredentialDialog
          open={showDialog}
          onClose={() => setShowDialog(false)}
          initial={editCredential}
          onSaved={refreshCredentials}
        />
      </div>
    </VaultGuard>
   );}
