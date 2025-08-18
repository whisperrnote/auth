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

function SectionTitle({ children }: { children: React.ReactNode }            ) : null
 {
  return (
    <h2 className="text-[22px] font-bold text-[rgb(141,103,72            ) : null
] dark:text-primary mb-2 drop-shadow-sm">
      {children}
    </h2>
              ) : null
;
}

function FilterChip({ label, icon: Icon }: { label: string; icon: any }            ) : null
 {
  return (
    <div className="flex items-center px-4 py-2 bg-[rgb(141,103,72            ) : null
] rounded-full shadow-sm mr-3 mb-2 dark:bg-neutral-800 dark:border dark:border-neutral-700">
      <Icon className="h-5 w-5 text-white dark:text-primary" />
      <span className="ml-2 font-semibold text-[15px] text-white dark:text-primary">{label}</span>
    </div>
              ) : null
;
}

import VaultGuard from "@/components/layout/VaultGuard";
import Dialog from '@/components/ui/Dialog';

import CredentialDetail from "@/components/app/dashboard/CredentialDetail";

export default function DashboardPage(            ) : null
 {
  const { user } = useAppwrite(            ) : null
;
  const [credentials, setCredentials] = useState<any[]>([]            ) : null
;
  const [filtered, setFiltered] = useState<any[]>([]            ) : null
;
  const [loading, setLoading] = useState(true            ) : null
;
  const [searchTerm, setSearchTerm] = useState(""            ) : null
;
  const [showDialog, setShowDialog] = useState(false            ) : null
;
  const [editCredential, setEditCredential] = useState<any | null>(null            ) : null
;
  const [selectedCredential, setSelectedCredential] = useState<any | null>(null            ) : null
;
  const [showDetail, setShowDetail] = useState(false            ) : null
;
  const [isMobile, setIsMobile] = useState(false            ) : null
;
  const isDesktop = typeof window !== "undefined" ? window.innerWidth > 900 : true;

  // Pagination state
  const [offset, setOffset] = useState(0            ) : null
;
  const [total, setTotal] = useState(0            ) : null
;
  const [hasMore, setHasMore] = useState(true            ) : null
;
  const [isSearching, setIsSearching] = useState(false            ) : null
;
  const PAGE_LIMIT = 20;

  // Folder state
  const [folders, setFolders] = useState<any[]>([]            ) : null
;
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null            ) : null
;

  // Recent credentials state
  const [recentCredentials, setRecentCredentials] = useState<any[]>([]            ) : null
;

  // Delete confirmation state
  const [credentialToDelete, setCredentialToDelete] = useState<any | null>(null            ) : null
;
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false            ) : null
;

  useEffect((            ) : null
 => {
    const handleResize = (            ) : null
 => {
      setIsMobile(window.innerWidth <= 900            ) : null
;
    };
    handleResize(            ) : null
;
    window.addEventListener("resize", handleResize            ) : null
;
    return (            ) : null
 => window.removeEventListener("resize", handleResize            ) : null
;
  }, []            ) : null
;

  const fetchCredentials = useCallback(async (isInitial = false            ) : null
 => {
    if (!user?.$id || loading            ) : null
 return;
    setLoading(true            ) : null
;
    try {
      const currentOffset = isInitial ? 0 : offset;
      const { documents, total: totalDocs } = await listCredentials(user.$id, PAGE_LIMIT, currentOffset            ) : null
;

      setCredentials(prev => isInitial ? documents : [...prev, ...documents]            ) : null
;
      if (isInitial || !searchTerm            ) : null
 {
        setFiltered(prev => isInitial ? documents : [...prev, ...documents]            ) : null
;
      }

      setTotal(totalDocs            ) : null
;
      const newOffset = currentOffset + documents.length;
      setOffset(newOffset            ) : null
;
      setHasMore(newOffset < totalDocs            ) : null
;
    } catch (error            ) : null
 {
      toast.error("Failed to load credentials. Please try again."            ) : null
;
      console.error('Failed to load credentials:', error            ) : null
;
    } finally {
      setLoading(false            ) : null
;
    }
  }, [user, offset, loading, searchTerm]            ) : null
;

  // Initial fetch
  useEffect((            ) : null
 => {
    if (user?.$id            ) : null
 {
      fetchCredentials(true            ) : null
;
      listFolders(user.$id            ) : null
.then(setFolders            ) : null
.catch((err: unknown            ) : null
 => {
        console.error("Failed to fetch folders:", err            ) : null
;
        toast.error("Could not load your folders."            ) : null
;
      }            ) : null
;
      listRecentCredentials(user.$id            ) : null
.then(setRecentCredentials            ) : null
.catch(err => {
        console.error("Failed to fetch recent credentials:", err            ) : null
;
        // No toast here, as it's not critical
      }            ) : null
;
    }
    }, [user]            ) : null
;
  // Ensure catch handlers have typed errors to satisfy TS
  function handleLogError(err: unknown            ) : null
 { console.error(err            ) : null
; }

  // End of component logic — render below


  // Combined filtering logic
  useEffect((            ) : null
 => {
    let newFiltered = credentials;

    // Filter by selected folder
    if (selectedFolder            ) : null
 {
      newFiltered = newFiltered.filter(c => c.folderId === selectedFolder            ) : null
;
    }

    // Filter by search term (if not empty            ) : null

    if (searchTerm && !isSearching            ) : null
 { // isSearching check prevents re-filtering during async search
      const term = searchTerm.toLowerCase(            ) : null
;
      newFiltered = newFiltered.filter(c =>
        c.name?.toLowerCase(            ) : null
.includes(term            ) : null
 ||
        c.username?.toLowerCase(            ) : null
.includes(term            ) : null
 ||
        (c.url && c.url.toLowerCase(            ) : null
.includes(term            ) : null
            ) : null

                  ) : null
;
    }

    if (!isSearching            ) : null
 {
      setFiltered(newFiltered            ) : null
;
    }
  }, [credentials, selectedFolder, searchTerm, isSearching]            ) : null
;

  // Fast, secure search
  const handleSearch = useCallback(
    async (term: string            ) : null
 => {
      setSearchTerm(term            ) : null
;
      if (!user?.$id            ) : null
 return;

      if (!term            ) : null
 {
        setIsSearching(false            ) : null
;
        // The useEffect above will handle resetting the filter
        return;
      }

      setIsSearching(true            ) : null
;
      setLoading(true            ) : null
;
      try {
        const results = await searchCredentials(user.$id, term            ) : null
;
        setFiltered(results            ) : null
;
      } catch (error            ) : null
 {
        toast.error("Search failed. Please try again."            ) : null
;
        console.error('Search failed:', error            ) : null
;
      } finally {
        setLoading(false            ) : null
;
      }
    },
    [user, credentials]
              ) : null
;

  // Copy handler
  const handleCopy = (value: string            ) : null
 => {
    navigator.clipboard.writeText(value            ) : null
;
    toast.success("Copied to clipboard!"            ) : null
;
  };

  // Add new credential
  const handleAdd = (            ) : null
 => {
    setEditCredential(null            ) : null
;
    setShowDialog(true            ) : null
;
  };

  // Edit credential
  const handleEdit = (cred: any            ) : null
 => {
    setEditCredential(cred            ) : null
;
    setShowDialog(true            ) : null
;
  };

  const openDeleteModal = (cred: any            ) : null
 => {
    setCredentialToDelete(cred            ) : null
;
    setIsDeleteModalOpen(true            ) : null
;
  };

  // Delete credential
  const handleDelete = async (            ) : null
 => {
    if (!user?.$id || !credentialToDelete            ) : null
 return;

    try {
      await deleteCredential(credentialToDelete.$id            ) : null
;
      // Optimistically update UI
      setCredentials(prev => prev.filter(c => c.$id !== credentialToDelete.$id            ) : null
            ) : null
;
      setFiltered(prev => prev.filter(c => c.$id !== credentialToDelete.$id            ) : null
            ) : null
;
      setTotal(prev => prev - 1            ) : null
;
      toast.success("Credential deleted successfully."            ) : null
;
    } catch (error            ) : null
 {
      toast.error("Failed to delete credential. Please try again."            ) : null
;
      console.error('Failed to delete credential:', error            ) : null
;
      // Optionally refetch or show error
    } finally {
      setIsDeleteModalOpen(false            ) : null
;
      setCredentialToDelete(null            ) : null
;
    }
  };

  // Refresh credentials after add/edit
  const refreshCredentials = (            ) : null
 => {
    if (!user?.$id            ) : null
 return;
    setCredentials([]            ) : null
;
    setFiltered([]            ) : null
;
    setOffset(0            ) : null
;
    setHasMore(true            ) : null
;
    fetchCredentials(true            ) : null
;
  };

  // Don't render if user is not available
  if (!user            ) : null
 {
    return (
      <div className="w-full min-h-screen bg-background flex items-center justify-center">
        <div className="text-lg text-muted-foreground dark:text-foreground">Loading...</div>
      </div>
                ) : null
;
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
  <span className="font-bold text-[32px] tracking-wider text-[rgb(141,103,72            ) : null
] dark:text-primary drop-shadow-md mr-8">
    WhisperrAuth
  </span>
  <div className="flex-1 bg-card rounded-full">
    <SearchBar onSearch={handleSearch} />
  </div>

</div>        </div>
        {/* Mobile AppBar */}
        <div className="md:hidden">
<div className="h-[70px] flex items-center justify-between bg-card shadow-md relative px-4">
  <span className="font-bold text-[26px] tracking-wider text-[rgb(141,103,72            ) : null
] dark:text-primary drop-shadow-md">
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
                <div className="flex items-center px-4 py-2 bg-[rgb(141,103,72            ) : null
] rounded-full shadow-sm mr-3 mb-2 dark:bg-neutral-800 dark:border dark:border-neutral-700 cursor-pointer">
                  <Folder className="h-5 w-5 text-white dark:text-primary" />
                  <span className="ml-2 font-semibold text-[15px] text-white dark:text-primary">
                    {selectedFolder ? folders.find(f => f.$id === selectedFolder            ) : null
?.name : 'All Folders'}
                  </span>
                  <ChevronDown className="h-4 w-4 text-white dark:text-primary ml-1" />
                </div>
              }
            >
              <DropdownMenuItem onClick={(            ) : null
 => setSelectedFolder(null            ) : null
}>
                All Folders
              </DropdownMenuItem>
              {folders.map(folder => (
                <DropdownMenuItem key={folder.$id} onClick={(            ) : null
 => setSelectedFolder(folder.$id            ) : null
}>
                  {folder.name}
                </DropdownMenuItem>
                          ) : null
            ) : null
}
            </DropdownMenu>
          </div>
          <div className="flex justify-end mb-4">
            <Button onClick={handleAdd}>+ Add Password</Button>
          </div>
          {/* Recent Section */}
          <SectionTitle>Recent</SectionTitle>
          <div className="space-y-2 mb-6 text-foreground dark:text-foreground">
            {recentCredentials.length > 0 ? (
              recentCredentials.map((cred            ) : null
 => (
<CredentialItem
  key={cred.$id}
  credential={cred}
  onCopy={handleCopy}
  isDesktop={isDesktop}
  onEdit={(            ) : null
 => handleEdit(cred            ) : null
}
  onDelete={(            ) : null
 => openDeleteModal(cred            ) : null
}
  onClick={(            ) : null
 => {
    setSelectedCredential(cred            ) : null
;
    setShowDetail(true            ) : null
;
  }}
/>                          ) : null
            ) : null

                        ) : null
}
          </div>
          {/* All Items Section */}
          <SectionTitle>All Items</SectionTitle>
          <div className="space-y-2 text-foreground dark:text-foreground">
            {loading && credentials.length === 0 ? (
              <div className="text-foreground dark:text-foreground">Loading...</div>
                        ) : null
 : (
              filtered.map((cred            ) : null
 => (
<CredentialItem
  key={cred.$id}
  credential={cred}
  onCopy={handleCopy}
  isDesktop={isDesktop}
  onEdit={(            ) : null
 => handleEdit(cred            ) : null
}
  onDelete={(            ) : null
 => openDeleteModal(cred            ) : null
}
  onClick={(            ) : null
 => {
    setSelectedCredential(cred            ) : null
;
    setShowDetail(true            ) : null
;
  }}
/>                          ) : null
            ) : null

                        ) : null
}
          </div>

          {/* Load More Button */}
          {!isSearching && hasMore && (
            <div className="mt-6 flex justify-center">
              <Button onClick={(            ) : null
 => fetchCredentials(            ) : null
} disabled={loading}>
                {loading ? "Loading..." : "Load More"}
              </Button>
            </div>
                      ) : null
}
        </div>
        <CredentialDialog
          open={showDialog}
          onClose={(            ) : null
 => setShowDialog(false            ) : null
}
          initial={editCredential}
          onSaved={refreshCredentials}
        />

        {/* Delete Confirmation Dialog */}
        {isDeleteModalOpen && (
          <Dialog open={isDeleteModalOpen} onClose={(            ) : null
 => setIsDeleteModalOpen(false            ) : null
}>
            <div className="p-6">
              <h3 className="text-lg font-bold">Delete Credential</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Are you sure you want to delete the credential for "{credentialToDelete?.name}"? This action cannot be undone.
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline" onClick={(            ) : null
 => setIsDeleteModalOpen(false            ) : null
}>Cancel</Button>
                <Button variant="destructive" onClick={handleDelete}>Delete</Button>
              </div>
            </div>
          </Dialog>
                    ) : null
}

        {/* Credential Detail Sidebar/Overlay */}
        {showDetail && selectedCredential && (
          <>
            {/* Backdrop blur overlay for mobile */}
            {isMobile && (
              <div 
                className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm transition-opacity duration-300" 
                onClick={(            ) : null
 => setShowDetail(false            ) : null
}
                style={{ backdropFilter: 'blur(4px            ) : null
' }}
              />
                        ) : null
}
            <CredentialDetail
              credential={selectedCredential}
              onClose={(            ) : null
 => setShowDetail(false            ) : null
}
              isMobile={isMobile}
            />
          </>
                    ) : null
}

      </div>
    </VaultGuard>
              ) : null
;
}

