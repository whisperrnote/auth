"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { Credentials, Folders as FolderDoc } from "@/types/appwrite.d";
import { Folder, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAppwrite } from "@/app/appwrite-provider";
import {
  deleteCredential,
  listCredentials,
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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[22px] font-bold text-[rgb(141,103,72)] dark:text-primary mb-2 drop-shadow-sm">
      {children}
    </h2>
  );
}

export default function DashboardPage() {
  const { user } = useAppwrite();
  // Master list of all loaded credentials for client-side search
  const [allCredentials, setAllCredentials] = useState<Credentials[]>([]);
  // Currently displayed credentials (derived from allCredentials + search + pagination)
  const [credentials, setCredentials] = useState<Credentials[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editCredential, setEditCredential] = useState<Credentials | null>(null);
  const [selectedCredential, setSelectedCredential] = useState<Credentials | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const isDesktop = typeof window !== "undefined" ? window.innerWidth > 900 : true;

  // Enhanced pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  // Folder state
  const [folders, setFolders] = useState<FolderDoc[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

  // Recent credentials state
  const [recentCredentials, setRecentCredentials] = useState<Credentials[]>([]);

  // Delete confirmation state
  const [credentialToDelete, setCredentialToDelete] = useState<Credentials | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 900);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fetchCredentials = useCallback(
    async (page: number = 1, resetData: boolean = true) => {
      if (!user?.$id) return;

      const isFirstPage = page === 1;
      if (isFirstPage) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const offset = (page - 1) * pageSize;
        const result = await listCredentials(user.$id, pageSize, offset);

        let docs = result.documents;
        if (selectedFolder) {
          docs = docs.filter((c: Credentials) => c.folderId === selectedFolder);
        }

        // Update the master list of all loaded credentials
        if (resetData || isFirstPage) {
          setAllCredentials(docs);
        } else {
          setAllCredentials((prev) => {
            const merged = [...prev, ...docs];
            // de-duplicate by $id to avoid duplicates when changing filters
            const seen = new Set<string>();
            return merged.filter((c: Credentials) => {
              const id = c.$id as string;
              if (seen.has(id)) return false;
              seen.add(id);
              return true;
            });
          });
        }

        // For initial/non-search view, set current page items
        if (!searchTerm.trim()) {
          if (resetData || isFirstPage) {
            setCredentials(docs);
          } else {
            setCredentials((prev) => [...prev, ...(docs as Credentials[])]);
          }
        }

        setTotal(result.total);
      } catch (error) {
        toast.error("Failed to load credentials. Please try again.");
        console.error("Failed to load credentials:", error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [user, pageSize, selectedFolder, searchTerm]
  );

  useEffect(() => {
    if (user?.$id) {
      setCurrentPage(1);
      fetchCredentials(1, true);
      
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
  }, [user, selectedFolder, fetchCredentials]);

  const handleSearch = useCallback(
    (term: string) => {
      // client-side instant filtering, keep pagination intact
      setSearchTerm(term);
      setCurrentPage(1);
    },
    [setSearchTerm]
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    if (!searchTerm.trim()) {
      // Server-backed pagination when not searching
      fetchCredentials(page, true);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
    if (!searchTerm.trim()) {
      fetchCredentials(1, true);
    }
  };

  const handleLoadMore = () => {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    // Only load more from server when not searching
    if (!searchTerm.trim()) {
      fetchCredentials(nextPage, false);
    }
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
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!user?.$id || !credentialToDelete) return;

    try {
      await deleteCredential(credentialToDelete.$id);
      setCredentials((prev) => prev.filter((c) => c.$id !== credentialToDelete.$id));
      setTotal((prev) => prev - 1);
      toast.success("Credential deleted successfully.");
    } catch (error) {
      toast.error("Failed to delete credential. Please try again.");
      console.error("Failed to delete credential:", error);
    } finally {
      setIsDeleteModalOpen(false);
      setCredentialToDelete(null);
    }
  };

  const refreshCredentials = () => {
    if (!user?.$id) return;
    setCurrentPage(1);
    fetchCredentials(1, true);
    
    listRecentCredentials(user.$id)
      .then(setRecentCredentials)
      .catch(console.error);
  };

  const { isAuthReady } = useAppwrite();

  // Filter across ALL loaded credentials for client-side search
   const filteredCredentials = useMemo<Credentials[]>(() => {
    const source = searchTerm.trim() ? allCredentials : credentials;
    if (!searchTerm.trim()) return source;
    const term = searchTerm.toLowerCase();
     return source.filter((c: Credentials) => {
      const name = (c.name ?? "").toLowerCase();
      const username = (c.username ?? "").toLowerCase();
      const url = (c.url ?? "").toLowerCase();
      return name.includes(term) || username.includes(term) || url.includes(term);
    });
  }, [allCredentials, credentials, searchTerm]);

  if (!isAuthReady || !user) {
    return (
      <div className="w-full min-h-screen bg-background flex items-center justify-center">
        <div className="text-lg text-muted-foreground dark:text-foreground">Loading...</div>
      </div>
    );
  }

  // Determine totals based on context: when searching, use client-side total
  const clientTotal = filteredCredentials.length;
  const effectiveTotal = searchTerm.trim() ? clientTotal : total;
  const totalPages = Math.ceil(effectiveTotal / pageSize) || 1;
  const hasMore = !searchTerm.trim() && currentPage < totalPages;
 
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
              <DropdownMenuItem onClick={() => setSelectedFolder(null)}>
                All Folders
              </DropdownMenuItem>
              {folders.map((folder) => (
                <DropdownMenuItem
                  key={folder.$id}
                  onClick={() => setSelectedFolder(folder.$id)}
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
          {recentCredentials.length > 0 && !searchTerm && (
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
                {searchTerm ? `Search Results for "${searchTerm}"` : "All Items"}
            </SectionTitle>
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
              loading={loadingMore}
            />
          )}

          
          {/* Credentials List */}
          <div className="space-y-2 text-foreground dark:text-foreground">
            {loading ? (
              Array.from({ length: pageSize }).map((_, i) => (
                <CredentialSkeleton key={i} />
              ))
            ) : filteredCredentials.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {searchTerm 
                  ? `No credentials found matching "${searchTerm}"`
                  : "No credentials found. Add your first password to get started!"
                }
              </div>
            ) : (
              (searchTerm.trim() ?
                // Client-side pagination when searching
                filteredCredentials.slice((currentPage - 1) * pageSize, currentPage * pageSize)
                : filteredCredentials
              ).map((cred) => (
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

            
            {loadingMore && (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <CredentialSkeleton key={`loading-${i}`} />
                ))}
              </div>
            )}
          </div>

          {/* Bottom Pagination Controls */}
          {!loading && effectiveTotal > 0 && (
            <div className="mt-6">
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={effectiveTotal}
                pageSize={pageSize}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
                loading={loadingMore}
                showPageSize={false}
              />
            </div>
          )}


          {/* Load More Button */}
          {!loading && hasMore && !searchTerm.trim() && (
            <div className="mt-6 flex justify-center">
              <Button 
                onClick={handleLoadMore} 
                disabled={loadingMore}
                variant="outline"
              >
                {loadingMore ? "Loading..." : "Load More"}
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
                Are you sure you want to delete the credential for &quot;{credentialToDelete?.name}&quot;? This action cannot be undone.
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
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