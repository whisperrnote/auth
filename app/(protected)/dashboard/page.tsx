"use client";

import { useState, useEffect, useCallback } from "react";
import { Folder, BookMarked, Layers, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAppwrite } from "@/app/appwrite-provider";
import { createCredential, updateCredential, deleteCredential, listCredentials, searchCredentials, listFolders, listRecentCredentials } from "@/lib/appwrite";
import toast from "react-hot-toast";
import CredentialItem from "@/components/app/dashboard/CredentialItem";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/DropdownMenu";
import SearchBar from "@/components/app/dashboard/SearchBar";
import CredentialDialog from "@/components/app/dashboard/CredentialDialog";
import PasswordGenerator from "@/components/ui/PasswordGenerator";
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
    <div className="flex items-center px-4 py-2 bg-[rgb(141,103,72)] rounded-full shadow-sm mr-3 mb-2 dark:bg-neutral-800 dark:border dark:border-neutral-700">
      <Icon className="h-5 w-5 text-white dark:text-primary" />
      <span className="ml-2 font-semibold text-[15px] text-white dark:text-primary">{label}</span>
    </div>
  );
}

import VaultGuard from "@/components/layout/VaultGuard";
import Dialog from '@/components/ui/Dialog';

import CredentialDetail from "@/components/app/dashboard/CredentialDetail";

export default function DashboardPage() {
  const { user } = useAppwrite();
  const [credentials, setCredentials] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editCredential, setEditCredential] = useState<any | null>(null);
  const [selectedCredential, setSelectedCredential] = useState<any | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const isDesktop = typeof window !== "undefined" ? window.innerWidth > 900 : true;

  // Pagination state
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const PAGE_LIMIT = 20;

  // Folder state
  const [folders, setFolders] = useState<any[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

  // Recent credentials state
  const [recentCredentials, setRecentCredentials] = useState<any[]>([]);

  // Delete confirmation state
  const [credentialToDelete, setCredentialToDelete] = useState<any | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 900);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fetchCredentials = useCallback(async (isInitial = false) => {
    if (!user?.$id || loading) return;
    setLoading(true);
    try {
      const currentOffset = isInitial ? 0 : offset;
      const { documents, total: totalDocs } = await listCredentials(user.$id, PAGE_LIMIT, currentOffset);

      setCredentials(prev => isInitial ? documents : [...prev, ...documents]);
      if (isInitial || !searchTerm) {
        setFiltered(prev => isInitial ? documents : [...prev, ...documents]);
      }

      setTotal(totalDocs);
      const newOffset = currentOffset + documents.length;
      setOffset(newOffset);
      setHasMore(newOffset < totalDocs);
    } catch (error) {
      toast.error("Failed to load credentials. Please try again.");
      console.error('Failed to load credentials:', error);
    } finally {
      setLoading(false);
    }
  }, [user, offset, loading, searchTerm]);

  // Initial fetch
  useEffect(() => {
    if (user?.$id) {
      fetchCredentials(true);
      listFolders(user.$id).then(setFolders).catch((err: unknown) => {
        console.error("Failed to fetch folders:", err);
        toast.error("Could not load your folders.");
      });
      listRecentCredentials(user.$id).then(setRecentCredentials).catch(err => {
        console.error("Failed to fetch recent credentials:", err);
        // No toast here, as it's not critical
      });
    }
    }, [user]);

  // Ensure catch handlers have typed errors to satisfy TS
  function handleLogError(err: unknown) { console.error(err); }

  // End of component logic — render below


  // Combined filtering logic
  useEffect(() => {
    let newFiltered = credentials;

    // Filter by selected folder
    if (selectedFolder) {
      newFiltered = newFiltered.filter(c => c.folderId === selectedFolder);
    }

    // Filter by search term (if not empty)
    if (searchTerm && !isSearching) { // isSearching check prevents re-filtering during async search
      const term = searchTerm.toLowerCase();
      newFiltered = newFiltered.filter(c =>
        c.name?.toLowerCase().includes(term) ||
        c.username?.toLowerCase().includes(term) ||
        (c.url && c.url.toLowerCase().includes(term))
      );
    }

    if (!isSearching) {
      setFiltered(newFiltered);
    }
  }, [credentials, selectedFolder, searchTerm, isSearching]);

  // Fast, secure search
  const handleSearch = useCallback(
    async (term: string) => {
      setSearchTerm(term);
      if (!user?.$id) return;

      if (!term) {
        setIsSearching(false);
        // The useEffect above will handle resetting the filter
        return;
      }

      setIsSearching(true);
      setLoading(true);
      try {
        const results = await searchCredentials(user.$id, term);
        setFiltered(results);
      } catch (error) {
        toast.error("Search failed. Please try again.");
        console.error('Search failed:', error);
      } finally {
        setLoading(false);
      }
    },
    [user, credentials]
  );

  // Copy handler
  const handleCopy = (value: string) => {
    navigator.clipboard.writeText(value);
    toast.success("Copied to clipboard!");
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

  const openDeleteModal = (cred: any) => {
    setCredentialToDelete(cred);
    setIsDeleteModalOpen(true);
  };

  // Delete credential
  const handleDelete = async () => {
    if (!user?.$id || !credentialToDelete) return;

    try {
      await deleteCredential(credentialToDelete.$id);
      // Optimistically update UI
      setCredentials(prev => prev.filter(c => c.$id !== credentialToDelete.$id));
      setFiltered(prev => prev.filter(c => c.$id !== credentialToDelete.$id));
      setTotal(prev => prev - 1);
      toast.success("Credential deleted successfully.");
    } catch (error) {
      toast.error("Failed to delete credential. Please try again.");
      console.error('Failed to delete credential:', error);
      // Optionally refetch or show error
    } finally {
      setIsDeleteModalOpen(false);
      setCredentialToDelete(null);
    }
  };

  // Refresh credentials after add/edit
  const refreshCredentials = () => {
    if (!user?.$id) return;
    setCredentials([]);
    setFiltered([]);
    setOffset(0);
    setHasMore(true);
    fetchCredentials(true);
  };

  // Don't render if user is not available
  if (!user) {
    return (
      <div className="w-full min-h-screen bg-background flex items-center justify-center">
        <div className="text-lg text-muted-foreground dark:text-foreground">Loading...</div>
      </div>
    );
  }

  // Render UI
  return (
    <VaultGuard>
      {/* Ensures dark mode is inherited for all children */}
      {/* Main Dashboard Content */}
      <div className="w-full min-h-screen bg-background flex flex-col">
        {/* Desktop AppBar */}
        <div className="hidden md:block">
<div className="h-20 px-8 flex items-center bg-card rounded-b-3xl shadow-md">
  <span className="font-bold text-[32px] tracking-wider text-[rgb(141,103,72)] dark:text-primary drop-shadow-md mr-8">
    WhisperrAuth
  </span>
  <div className="flex-1 bg-card rounded-full">
    <SearchBar onSearch={handleSearch} />
  </div>

</div>        </div>
        {/* Mobile AppBar */}
        <div className="md:hidden">
<div className="h-[70px] flex items-center justify-between bg-card shadow-md relative px-4">
  <span className="font-bold text-[26px] tracking-wider text-[rgb(141,103,72)] dark:text-primary drop-shadow-md">
    WhisperrAuth
  </span>

  <div className="absolute left-0 right-0 bottom-0 px-2 pb-2 bg-card rounded-full">
    <SearchBar onSearch={handleSearch} />
  </div>
</div>        </div>
        {/* Main Content */}
        <div className="flex-1 w-full max-w-4xl mx-auto px-4 md:px-8 py-6 bg-card rounded-lg shadow">
          {/* Filter chips */}
          <div className="flex flex-wrap items-center py-4">
            <DropdownMenu
              trigger={
                <div className="flex items-center px-4 py-2 bg-[rgb(141,103,72)] rounded-full shadow-sm mr-3 mb-2 dark:bg-neutral-800 dark:border dark:border-neutral-700 cursor-pointer">
                  <Folder className="h-5 w-5 text-white dark:text-primary" />
                  <span className="ml-2 font-semibold text-[15px] text-white dark:text-primary">
                    {selectedFolder ? folders.find(f => f.$id === selectedFolder)?.name : 'All Folders'}
                  </span>
                  <ChevronDown className="h-4 w-4 text-white dark:text-primary ml-1" />
                </div>
              }
            >
              <DropdownMenuItem onClick={() => setSelectedFolder(null)}>
                All Folders
              </DropdownMenuItem>
              {folders.map(folder => (
                <DropdownMenuItem key={folder.$id} onClick={() => setSelectedFolder(folder.$id)}>
                  {folder.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenu>
          </div>
          <div className="flex justify-end mb-4">
            <Button onClick={handleAdd}>+ Add Password</Button>
          </div>
          {/* Recent Section */}
          <SectionTitle>Recent</SectionTitle>
          <div className="space-y-2 mb-6 text-foreground dark:text-foreground">
            {recentCredentials.length > 0 ? (
              recentCredentials.map((cred) => (
<CredentialItem
  key={cred.$id}
  credential={cred}
  onCopy={handleCopy}
  isDesktop={isDesktop}
  onEdit={() => handleEdit(cred)}
  onDelete={() => openDeleteModal(cred)}
  onClick={() => {
    setSelectedCredential(cred);
    setShowDetail(true);
  }}
/>              ))
            )}
          </div>
          {/* All Items Section */}
          <SectionTitle>All Items</SectionTitle>
          <div className="space-y-2 text-foreground dark:text-foreground">
            {loading && credentials.length === 0 ? (
              <div className="text-foreground dark:text-foreground">Loading...</div>
            ) : (
              filtered.map((cred) => (
<CredentialItem
  key={cred.$id}
  credential={cred}
  onCopy={handleCopy}
  isDesktop={isDesktop}
  onEdit={() => handleEdit(cred)}
  onDelete={() => openDeleteModal(cred)}
  onClick={() => {
    setSelectedCredential(cred);
    setShowDetail(true);
  }}
/>              ))
            )}
          </div>

          {/* Load More Button */}
          {!isSearching && hasMore && (
            <div className="mt-6 flex justify-center">
              <Button onClick={() => fetchCredentials()} disabled={loading}>
                {loading ? "Loading..." : "Load More"}
              </Button>
            </div>
          )}
        </div>
        <CredentialDialog
          open={showDialog}
          onClose={() => setShowDialog(false)}
          initial={editCredential}
          onSaved={refreshCredentials}
        />

        {/* Delete Confirmation Dialog */}
        {isDeleteModalOpen && (
          <Dialog open={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)}>
            <div className="p-6">
              <h3 className="text-lg font-bold">Delete Credential</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Are you sure you want to delete the credential for "{credentialToDelete?.name}"? This action cannot be undone.
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
                <Button variant="destructive" onClick={handleDelete}>Delete</Button>
              </div>
            </div>
          </Dialog>
        )}

        {/* Credential Detail Sidebar/Overlay */}
        {showDetail && selectedCredential && (
          <>
            {/* Backdrop blur overlay for mobile */}
            {isMobile && (
              <div 
                className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm transition-opacity duration-300" 
                onClick={() => setShowDetail(false)}
                style={{ backdropFilter: 'blur(4px)' }}
              />
            )}
            <CredentialDetail
              credential={selectedCredential}
              onClose={() => setShowDetail(false)}
              isMobile={isMobile}
            />
          </>
        )}

      </div>
    </VaultGuard>
   );}
