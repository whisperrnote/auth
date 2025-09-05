"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { Credentials, Folders as FolderDoc } from "@/types/appwrite.d";
import { Folder, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAppwrite } from "@/app/appwrite-provider";
import {
  deleteCredential,
  listAllCredentials,
  listFolders,
  listRecentCredentials,
} from "@/lib/appwrite";
import toast from "react-hot-toast";
import CredentialItem from "@/components/app/dashboard/CredentialItem";
import CredentialSkeleton from "@/components/app/dashboard/CredentialSkeleton";
import PaginationControls from "@/components/app/dashboard/PaginationControls";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/DropdownMenu";
import SearchBar from "@/components/app/dashboard/SearchBar";
import CredentialDialog from "@/components/app/dashboard/CredentialDialog";
import VaultGuard from "@/components/layout/VaultGuard";
import { Dialog } from "@/components/ui/Dialog";
import CredentialDetail from "@/components/app/dashboard/CredentialDetail";
import MasterPasswordVerificationDialog from "@/components/overlays/MasterPasswordVerificationDialog";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[22px] font-bold text-[rgb(141,103,72)] dark:text-primary mb-2 drop-shadow-sm">
      {children}
    </h2>
  );
}

export default function DashboardPage() {
  const { user } = useAppwrite();
  // State for all credentials, fetched once
  const [allCredentials, setAllCredentials] = useState<Credentials[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editCredential, setEditCredential] = useState<Credentials | null>(
    null,
  );
  const [selectedCredential, setSelectedCredential] =
    useState<Credentials | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const isDesktop =
    typeof window !== "undefined" ? window.innerWidth > 900 : true;

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Folder state
  const [folders, setFolders] = useState<FolderDoc[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

  // Recent credentials state
  const [recentCredentials, setRecentCredentials] = useState<Credentials[]>([]);

  // Delete confirmation state
  const [credentialToDelete, setCredentialToDelete] =
    useState<Credentials | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isVerificationOpen, setIsVerificationOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 900);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Fetch all credentials once
  const loadAllCredentials = useCallback(async () => {
    if (!user?.$id) return;
    setLoading(true);
    try {
      const credentials = await listAllCredentials(user.$id);
      setAllCredentials(credentials);
    } catch (error) {
      toast.error("Failed to load credentials. Please try again.");
      console.error("Failed to load credentials:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user?.$id) {
      loadAllCredentials();

      listFolders(user.$id)
        .then(setFolders)
        .catch((err: unknown) => {
          console.error("Failed to fetch folders:", err);
          toast.error("Could not load your folders.");
        });

      listRecentCredentials(user.$id)
        .then(setRecentCredentials)
        .catch((err: unknown) => {
          console.error("Failed to fetch recent credentials:", err);
        });
    }
  }, [user, loadAllCredentials]);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  const handleCopy = (value: string) => {
    navigator.clipboard.writeText(value);
    toast.success("Copied to clipboard!");
  };

  const handleAdd = () => {
    setEditCredential(null);
    setShowDialog(true);
  };

  const handleEdit = (cred: Credentials) => {
    setEditCredential(cred);
    setShowDialog(true);
  };

  const openDeleteModal = (cred: Credentials) => {
    setCredentialToDelete(cred);
    setIsVerificationOpen(true);
  };

  const handleDelete = async () => {
    if (!user?.$id || !credentialToDelete) return;

    try {
      await deleteCredential(credentialToDelete.$id);
      // Remove from the main list
      setAllCredentials((prev) =>
        prev.filter((c) => c.$id !== credentialToDelete.$id),
      );
      toast.success("Credential deleted successfully.");
    } catch (error) {
      toast.error("Failed to delete credential. Please try again.");
      console.error("Failed to delete credential:", error);
    } finally {
      setIsDeleteModalOpen(false);
      setCredentialToDelete(null);
    }
  };

  // Refresh all data from server
  const refreshCredentials = () => {
    if (!user?.$id) return;
    loadAllCredentials();
    listRecentCredentials(user.$id)
      .then(setRecentCredentials)
      .catch(console.error);
  };

  const { isAuthReady } = useAppwrite();

  // Client-side filtering and search
  const filteredCredentials = useMemo(() => {
    let source = allCredentials;

    // 1. Filter by folder
    if (selectedFolder) {
      source = source.filter((c) => c.folderId === selectedFolder);
    }

    // 2. Filter by search term (if any)
    if (searchTerm.trim()) {
      const normalizedTerm = searchTerm.trim().toLowerCase();
      source = source.filter((c) => {
        const name = (c.name || "").toLowerCase();
        const username = (c.username || "").toLowerCase();
        const url = (c.url || "").toLowerCase();
        const notes = (c.notes || "").toLowerCase();
        return (
          name.includes(normalizedTerm) ||
          username.includes(normalizedTerm) ||
          url.includes(normalizedTerm) ||
          notes.includes(normalizedTerm)
        );
      });
    }

    return source;
  }, [allCredentials, searchTerm, selectedFolder]);

  // Client-side pagination logic
  const paginatedCredentials = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredCredentials.slice(startIndex, startIndex + pageSize);
  }, [filteredCredentials, currentPage, pageSize]);

  if (!isAuthReady || !user) {
    return (
      <div className="w-full min-h-screen bg-background flex items-center justify-center">
        <div className="text-lg text-muted-foreground dark:text-foreground">
          Loading...
        </div>
      </div>
    );
  }

  const isSearching = !!searchTerm.trim();
  const effectiveTotal = filteredCredentials.length;
  const totalPages = Math.ceil(effectiveTotal / pageSize) || 1;

  return (
    <VaultGuard>
      <div className="w-full min-h-screen bg-background flex flex-col pb-20 lg:pb-6">
        {/* Desktop AppBar */}
        <div className="hidden md:block">
          <div className="h-20 px-8 flex items-center bg-card rounded-b-3xl shadow-md">
            <span className="font-bold text-[32px] tracking-wider text-[rgb(141,103,72)] dark:text-primary drop-shadow-md mr-8">
              WhisperrAuth
            </span>
            <div className="flex-1 bg-card rounded-full">
              <SearchBar onSearch={handleSearch} />
            </div>
          </div>
        </div>

        {/* Mobile AppBar */}
        <div className="md:hidden">
          <div className="h-[70px] flex items-center justify-between bg-card shadow-md relative px-4">
            <span className="font-bold text-[26px] tracking-wider text-[rgb(141,103,72)] dark:text-primary drop-shadow-md">
              WhisperrAuth
            </span>
            <div className="absolute left-0 right-0 bottom-0 px-2 pb-2 bg-card rounded-full">
              <SearchBar onSearch={handleSearch} />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 w-full max-w-4xl mx-auto px-4 md:px-8 py-6 bg-card rounded-lg shadow">
          {/* Filter chips */}
          <div className="flex flex-wrap items-center py-4">
            <DropdownMenu
              trigger={
                <div className="flex items-center px-4 py-2 bg-[rgb(141,103,72)] rounded-full shadow-sm mr-3 mb-2 dark:bg-neutral-800 dark:border dark:border-neutral-700 cursor-pointer">
                  <Folder className="h-5 w-5 text-white dark:text-primary" />
                  <span className="ml-2 font-semibold text-[15px] text-white dark:text-primary">
                    {selectedFolder
                      ? folders.find((f) => f.$id === selectedFolder)?.name
                      : "All Folders"}
                  </span>
                  <ChevronDown className="h-4 w-4 text-white dark:text-primary ml-1" />
                </div>
              }
            >
              <DropdownMenuItem
                onClick={() => {
                  setSelectedFolder(null);
                  setCurrentPage(1);
                }}
              >
                All Folders
              </DropdownMenuItem>
              {folders.map((folder) => (
                <DropdownMenuItem
                  key={folder.$id}
                  onClick={() => {
                    setSelectedFolder(folder.$id);
                    setCurrentPage(1);
                  }}
                >
                  {folder.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenu>
          </div>

          <div className="flex justify-end mb-4">
            <Button onClick={handleAdd}>+ Add Password</Button>
          </div>

          {/* Recent Section */}
          {!isSearching && !selectedFolder && recentCredentials.length > 0 && (
            <>
              <SectionTitle>Recent</SectionTitle>
              <div className="space-y-2 mb-6 text-foreground dark:text-foreground">
                {recentCredentials.map((cred) => (
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
                  />
                ))}
              </div>
            </>
          )}

          {/* All Items Section */}
          <div className="flex items-center justify-between mb-4">
            <SectionTitle>
              {isSearching ? `Search Results for "${searchTerm}"` : "All Items"}
            </SectionTitle>
            {isSearching && (
              <div
                aria-live="polite"
                aria-atomic="true"
                className="text-sm text-muted-foreground"
              >
                {effectiveTotal} result{effectiveTotal !== 1 ? "s" : ""}
              </div>
            )}
          </div>

          {/* Top Pagination Controls */}
          {!loading && effectiveTotal > 0 && (
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={effectiveTotal}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          )}

          {/* Credentials List */}
          <div className="space-y-2 text-foreground dark:text-foreground">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <CredentialSkeleton key={`skeleton-${i}`} />
              ))
            ) : paginatedCredentials.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {isSearching
                  ? `No credentials found matching "${searchTerm}"`
                  : "No credentials found. Add your first password to get started!"}
              </div>
            ) : (
              paginatedCredentials.map((cred: Credentials) => (
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
                />
              ))
            )}
          </div>

          {/* Bottom Pagination Controls */}
          {!loading && effectiveTotal > pageSize && (
            <div className="mt-6">
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={effectiveTotal}
                pageSize={pageSize}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
              />
            </div>
          )}
        </div>

        <CredentialDialog
          open={showDialog}
          onClose={() => setShowDialog(false)}
          initial={editCredential}
          onSaved={refreshCredentials}
        />

        {isVerificationOpen && (
          <MasterPasswordVerificationDialog
            open={isVerificationOpen}
            onClose={() => setIsVerificationOpen(false)}
            onSuccess={() => {
              setIsVerificationOpen(false);
              setIsDeleteModalOpen(true);
            }}
          />
        )}

        {/* Delete Confirmation Dialog */}
        {isDeleteModalOpen && (
          <Dialog
            open={isDeleteModalOpen}
            onClose={() => setIsDeleteModalOpen(false)}
          >
            <div className="p-6">
              <h3 className="text-lg font-bold">Delete Credential</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Are you sure you want to delete the credential for &quot;
                {credentialToDelete?.name}&quot;? This action cannot be undone.
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsDeleteModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDelete}>
                  Delete
                </Button>
              </div>
            </div>
          </Dialog>
        )}

        {/* Credential Detail Sidebar/Overlay */}
        {showDetail && selectedCredential && (
          <>
            {isMobile && (
              <div
                className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm transition-opacity duration-300"
                onClick={() => setShowDetail(false)}
                style={{ backdropFilter: "blur(4px)" }}
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
  );
}
