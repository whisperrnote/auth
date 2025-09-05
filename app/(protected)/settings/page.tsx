"use client";

import { useState, useEffect } from "react";
import type { Folders } from "@/types/appwrite";
import {
  User,
  Shield,
  Palette,
  Bell,
  Trash2,
  Download,
  Upload,
  LogOut,
  Key,
  Smartphone,
  Globe,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { Folder, Edit, Trash } from "lucide-react";
import { useTheme } from "@/app/providers";
import clsx from "clsx";
import {
  setVaultTimeout,
  getVaultTimeout,
} from "@/app/(protected)/masterpass/logic";
import { useAppwrite } from "@/app/appwrite-provider";
import TwofaSetup from "@/components/overlays/twofaSetup";
import { PasskeySetup } from "@/components/overlays/passkeySetup";
import {
  appwriteAccount,
  appwriteDatabases,
  APPWRITE_DATABASE_ID,
  APPWRITE_COLLECTION_USER_ID,
  createFolder,
  updateFolder,
  deleteFolder,
  listFolders,
  listMfaFactors,
  Query,
} from "@/lib/appwrite";
import {
  updateUserProfile,
  AppwriteService,
  exportAllUserData,
  deleteUserAccount,
  resetMasterpassAndWipe,
} from "@/lib/appwrite";
import toast from "react-hot-toast";
import MasterPasswordVerificationDialog from "@/components/overlays/MasterPasswordVerificationDialog";
import VaultGuard from "@/components/layout/VaultGuard";

// Hook to detect if sidebar is visible (desktop) or not (mobile)
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024); // Tailwind 'lg' breakpoint
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

import ImportSection from "./ImportSection";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAppwrite();
  const [profile, setProfile] = useState({
    name: user?.name || "",
    email: user?.email || "",
  }); // email is shown but not editable
  const [saving, setSaving] = useState(false);
  const [dangerLoading, setDangerLoading] = useState(false);
  const [vaultTimeout, setVaultTimeoutState] = useState(getVaultTimeout());
  const [showTwofa, setShowTwofa] = useState(false);
  const [twofaEnabled, setTwofaEnabled] = useState(false);
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] =
    useState(false);
  const [deleteStep, setDeleteStep] = useState<
    "initial" | "confirm" | "verify"
  >("initial");
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] =
    useState(false);
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passkeyEnabled, setPasskeyEnabled] = useState(false);
  const [passkeySetupOpen, setPasskeySetupOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isResetVerificationOpen, setIsResetVerificationOpen] = useState(false);

  // Folder Management State
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  type FolderItem = { $id: string; name: string };
  const [editingFolder, setEditingFolder] = useState<FolderItem | null>(null);
  const [folderName, setFolderName] = useState("");
  const [isDeleteFolderModalOpen, setIsDeleteFolderModalOpen] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<FolderItem | null>(null);
  // Folders list
  const [folders, setFolders] = useState<FolderItem[]>([]);

  // Load folders on mount
  useEffect(() => {
    const loadFolders = async () => {
      try {
        if (!user) return;
        const res = await listFolders(user.$id);
        // listFolders returns an array of folders; ensure we handle both array and object shapes
        const items = Array.isArray(res)
          ? res
          : res &&
              (res as { documents?: FolderItem[]; items?: FolderItem[] })
                .documents
            ? (res as { documents?: FolderItem[] }).documents!
            : res &&
                (res as { documents?: FolderItem[]; items?: FolderItem[] })
                  .items
              ? (res as { items?: FolderItem[] }).items!
              : [];
        setFolders(items);
      } catch (err) {
        console.error("Failed to load folders", err);
        setFolders([]);
      }
    };
    loadFolders();
  }, [user?.$id]);

  // Fetch latest 2fa status on mount and when dialog closes
  useEffect(() => {
    if (user?.$id) {
      fetchTwofaStatus();
    }
  }, [user?.$id, showTwofa]);

  // Sync and validate MFA status between Appwrite and database on page load
  useEffect(() => {
    if (user?.$id) {
      syncMfaStatus();
    }
  }, [user?.$id]);

  const syncMfaStatus = async () => {
    if (!user?.$id) return;

    try {
      // Get MFA status directly from Appwrite (source of truth)
      const factors = await listMfaFactors();
      const account = await appwriteAccount.get();
      const appwriteMfaEnabled = account.mfa || false;

      // Get current database status
      const userDocResponse = await appwriteDatabases.listDocuments(
        APPWRITE_DATABASE_ID,
        APPWRITE_COLLECTION_USER_ID,
        [Query.equal("userId", user.$id)],
      );

      if (userDocResponse.documents.length > 0) {
        const userDoc = userDocResponse.documents[0];
        const databaseMfaEnabled = userDoc.twofa === true;

        // Check if they're out of sync
        if (databaseMfaEnabled !== appwriteMfaEnabled) {
          console.log(
            `MFA status out of sync. Appwrite: ${appwriteMfaEnabled}, Database: ${databaseMfaEnabled}. Syncing...`,
          );

          // Update database to match Appwrite (source of truth)
          await appwriteDatabases.updateDocument(
            APPWRITE_DATABASE_ID,
            APPWRITE_COLLECTION_USER_ID,
            userDoc.$id,
            { twofa: appwriteMfaEnabled },
          );

          // Update local state to reflect the correct status
          setTwofaEnabled(appwriteMfaEnabled);
          console.log(
            `MFA status synced: database updated to ${appwriteMfaEnabled}`,
          );
        } else {
          // Already in sync, just update local state
          setTwofaEnabled(appwriteMfaEnabled);
        }
      }
    } catch (error) {
      console.error("Failed to sync MFA status:", error);
      // Fallback to regular status check
      fetchTwofaStatus();
    }
  };

  const fetchTwofaStatus = async () => {
    try {
      if (!user?.$id) return;

      // Check MFA status directly from Appwrite
      const factors = await listMfaFactors();
      const account = await appwriteAccount.get();
      const isEnforced = account.mfa || false;

      setTwofaEnabled(isEnforced);
    } catch (error) {
      console.error("Failed to fetch 2FA status:", error);
    }
  };

  // Fetch passkey status
  useEffect(() => {
    if (user?.$id) {
      AppwriteService.hasPasskey(user.$id).then(setPasskeyEnabled);
    }
  }, [user?.$id]);

  const handleTogglePasskey = async () => {
    if (!user?.$id) return;
    setPasskeySetupOpen(true);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      if (!user) throw new Error("Not authenticated");
      // Only allow updating the name, not the email
      await updateUserProfile(user.$id, { name: profile.name });
      toast.success("Profile updated!");
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast.error(err.message || "Failed to update profile.");
    }
    setSaving(false);
  };

  const handleExportData = async (forDelete: boolean = false) => {
    const toastId = toast.loading("Exporting data...");
    try {
      if (!user?.$id) throw new Error("Not authenticated");
      const data = await exportAllUserData(user.$id);
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `whisperrauth-export-${new Date().toISOString()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Data exported successfully!", { id: toastId });
      if (forDelete) {
        setDeleteStep("confirm");
      }
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast.error(err.message || "Failed to export data.", { id: toastId });
    }
  };

  const handleDeleteAccount = async () => {
    setDangerLoading(true);
    try {
      if (!user?.$id) throw new Error("Not authenticated");
      await deleteUserAccount(user.$id);
      toast.success("Account deleted successfully. Logging out...");
      setTimeout(() => {
        logout();
      }, 2000);
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast.error(err.message || "Failed to delete account.");
    } finally {
      setDangerLoading(false);
      setIsDeleteAccountModalOpen(false);
    }
  };

  const handleResetMasterPassword = async () => {
    setDangerLoading(true);
    try {
      if (!user?.$id) throw new Error("Not authenticated");
      await resetMasterpassAndWipe(user.$id);
      toast.success(
        "Master password reset successfully. All data has been wiped. Logging out...",
      );
      setTimeout(() => {
        logout();
      }, 2000);
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast.error(err.message || "Failed to reset master password.");
    } finally {
      setDangerLoading(false);
      setIsResetModalOpen(false);
      setIsResetVerificationOpen(false);
    }
  };

  const resetDeleteFlow = () => {
    setIsDeleteAccountModalOpen(false);
    setDeleteStep("initial");
  };

  const handleVaultTimeoutChange = (minutes: number) => {
    setVaultTimeout(minutes);
    setVaultTimeoutState(minutes);
    toast.success("Vault timeout updated!");
  };

  const handleChangePassword = async () => {
    setPasswordError(null);
    if (passwords.new !== passwords.confirm) {
      setPasswordError("New passwords do not match.");
      return;
    }
    if (passwords.new.length < 8) {
      setPasswordError("Password must be at least 8 characters long.");
      return;
    }

    setSaving(true);
    try {
      await appwriteAccount.updatePassword(passwords.new, passwords.current);
      toast.success("Password updated successfully!");
      setIsChangePasswordModalOpen(false);
      setPasswords({ current: "", new: "", confirm: "" });
    } catch (e: unknown) {
      const err = e as { message?: string };
      setPasswordError(err.message || "Failed to update password.");
    }
    setSaving(false);
  };

  const handleSaveFolder = async () => {
    if (!folderName || !user) return;
    setSaving(true);
    try {
      if (editingFolder) {
        // Update existing folder
        const updatedFolder = await updateFolder(editingFolder.$id, {
          name: folderName,
        });
        setFolders(
          folders.map((f) => (f.$id === editingFolder.$id ? updatedFolder : f)),
        );
        toast.success("Folder updated!");
      } else {
        // Create new folder
        const newFolder = await createFolder({
          name: folderName,
          userId: user.$id,
          parentFolderId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          $sequence: 0,
          $collectionId: "",
          $databaseId: "",
          $permissions: [],
        });
        setFolders([...folders, newFolder]);
        toast.success("Folder created!");
      }
      setIsFolderModalOpen(false);
      setEditingFolder(null);
      setFolderName("");
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast.error(err.message || "Failed to save folder.");
    }
    setSaving(false);
  };

  const openFolderModal = (folder: FolderItem | null = null) => {
    if (folder) {
      setEditingFolder(folder);
      setFolderName(folder.name);
    } else {
      setEditingFolder(null);
      setFolderName("");
    }
    setIsFolderModalOpen(true);
  };

  const openDeleteFolderModal = (folder: FolderItem) => {
    setFolderToDelete(folder);
    setIsDeleteFolderModalOpen(true);
  };

  const handleDeleteFolder = async () => {
    if (!folderToDelete || !user) return;
    setDangerLoading(true);
    try {
      await deleteFolder(folderToDelete.$id);
      setFolders(folders.filter((f) => f.$id !== folderToDelete.$id));
      toast.success("Folder deleted!");
      setIsDeleteFolderModalOpen(false);
      setFolderToDelete(null);
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast.error(err.message || "Failed to delete folder.");
    }
    setDangerLoading(false);
  };

  return (
    <VaultGuard>
      <div className="w-full min-h-screen bg-background flex flex-col items-center py-8 px-2 animate-fade-in">
        <div className="w-full max-w-5xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-primary drop-shadow-sm">
              Settings
            </h1>
            <p className="text-muted-foreground">
              Manage your account and preferences
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Profile Settings */}
            <Card className="animate-fade-in-up">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Full Name</label>
                  <Input
                    value={profile.name}
                    onChange={(e) =>
                      setProfile({ ...profile, name: e.target.value })
                    }
                    autoComplete="name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    value={profile.email}
                    readOnly
                    disabled
                    autoComplete="email"
                  />{" "}
                </div>
                <Button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className={clsx(
                    "transition-all duration-200",
                    saving && "opacity-70",
                  )}
                >
                  {saving ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin h-4 w-4 border-2 border-t-transparent border-primary rounded-full" />
                      Saving...
                    </span>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Security Settings */}
            <Card
              className="animate-fade-in-up"
              style={{ animationDelay: "60ms" }}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => setIsChangePasswordModalOpen(true)}
                >
                  <Key className="h-4 w-4" />
                  Change Password
                </Button>
                <Button
                  variant={twofaEnabled ? "default" : "outline"}
                  className="w-full justify-start gap-2"
                  onClick={() => setShowTwofa(true)}
                >
                  <Shield className="h-4 w-4" />
                  {twofaEnabled
                    ? "✅ Two-Factor Authentication Enabled"
                    : "Setup Two-Factor Authentication"}
                </Button>

                <Button
                  variant={passkeyEnabled ? "default" : "outline"}
                  className="w-full justify-start gap-2"
                  onClick={handleTogglePasskey}
                  disabled={false}
                >
                  <Key className="h-4 w-4" />
                  {passkeyEnabled
                    ? "✅ Passkey / Biometric Unlock Enabled"
                    : "Enable Passkey / Biometric Unlock"}
                </Button>

                {/* Vault Timeout Setting */}
                <div className="pt-4 border-t">
                  <div className="space-y-3">
                    <label className="text-sm font-medium">
                      Vault Auto-Lock Timeout
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[5, 10, 15, 30].map((minutes) => (
                        <Button
                          key={minutes}
                          variant={
                            vaultTimeout === minutes ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => handleVaultTimeoutChange(minutes)}
                          className="text-xs"
                        >
                          {minutes}m
                        </Button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        max="120"
                        value={vaultTimeout}
                        onChange={(e) =>
                          handleVaultTimeoutChange(
                            parseInt(e.target.value) || 10,
                          )
                        }
                        className="w-20 text-sm"
                      />
                      <span className="text-xs text-muted-foreground">
                        minutes
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Vault will auto-lock after {vaultTimeout} minutes of
                      inactivity
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Theme Settings */}
            <Card
              className="animate-fade-in-up"
              style={{ animationDelay: "120ms" }}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Appearance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Theme</label>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant={theme === "light" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTheme("light")}
                      aria-pressed={theme === "light"}
                    >
                      Light
                    </Button>
                    <Button
                      variant={theme === "dark" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTheme("dark")}
                      aria-pressed={theme === "dark"}
                    >
                      Dark
                    </Button>
                    <Button
                      variant={theme === "system" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTheme("system")}
                      aria-pressed={theme === "system"}
                    >
                      System
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Data Management */}
            <Card
              className="animate-fade-in-up"
              style={{ animationDelay: "180ms" }}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Data Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={handleExportData}
                >
                  <Download className="h-4 w-4" />
                  Export All Data
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => (window.location.href = "/import")}
                >
                  <Upload className="h-4 w-4" />
                  Import Data
                </Button>
              </CardContent>
            </Card>

            {/* Folder Management */}
            <Card
              className="animate-fade-in-up"
              style={{ animationDelay: "240ms" }}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Folder className="h-5 w-5" />
                    Folder Management
                  </span>
                  <Button size="sm" onClick={() => openFolderModal()}>
                    + Add Folder
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {folders.length > 0 ? (
                  folders.map((folder) => (
                    <div
                      key={folder.$id}
                      className="flex items-center justify-between p-2 rounded-md hover:bg-accent/50"
                    >
                      <span>{folder.name}</span>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openFolderModal(folder)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteFolderModal(folder)}
                        >
                          <Trash className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No folders created yet.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card
              className={clsx(
                "border-destructive animate-fade-in-up",
                dangerLoading && "opacity-70",
              )}
              style={{ animationDelay: "300ms" }}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <Trash2 className="h-5 w-5" />
                  Danger Zone
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium">Delete Account</h4>
                    <p className="text-sm text-muted-foreground">
                      Permanently delete your account and all associated data.
                      This action cannot be undone.
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => setIsDeleteAccountModalOpen(true)}
                    disabled={dangerLoading}
                    className="transition-all"
                  >
                    {dangerLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin h-4 w-4 border-2 border-t-transparent border-white rounded-full" />
                        Deleting...
                      </span>
                    ) : (
                      "Delete Account"
                    )}
                  </Button>
                  <div className="border-t border-destructive/50 pt-4">
                    <h4 className="font-medium">Reset Master Password</h4>
                    <p className="text-sm text-muted-foreground">
                      This will wipe all your encrypted data (credentials, TOTP
                      secrets) but keep your account. You will be logged out and
                      prompted to set a new master password.
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => setIsResetModalOpen(true)}
                    disabled={dangerLoading}
                    className="transition-all"
                  >
                    {dangerLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin h-4 w-4 border-2 border-t-transparent border-white rounded-full" />
                        Resetting...
                      </span>
                    ) : (
                      "Reset Master Password"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
          {/* Logout button for mobile */}
          <div className="mt-8 flex justify-end md:hidden">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-destructive hover:text-destructive"
              onClick={logout}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
        {showTwofa && (
          <TwofaSetup
            open={showTwofa}
            onClose={() => {
              setShowTwofa(false);
              // Refresh 2FA status after dialog closes
              setTimeout(fetchTwofaStatus, 500);
            }}
            user={user ? { $id: user.$id, email: user.email } : null}
            onStatusChange={(enabled) => {
              setTwofaEnabled(enabled);
              // Also refresh from database to ensure consistency
              setTimeout(fetchTwofaStatus, 500);
            }}
          />
        )}
        {isDeleteAccountModalOpen && deleteStep === "initial" && (
          <Dialog open={isDeleteAccountModalOpen} onClose={resetDeleteFlow}>
            <div className="p-6">
              <h3 className="text-lg font-bold">Delete Account</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                This is a permanent action. To prevent data loss, you must
                export your data first.
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline" onClick={resetDeleteFlow}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleExportData(true)}
                >
                  Export Data & Continue
                </Button>
              </div>
            </div>
          </Dialog>
        )}

        {isDeleteAccountModalOpen && deleteStep === "confirm" && (
          <Dialog open={isDeleteAccountModalOpen} onClose={resetDeleteFlow}>
            <div className="p-6">
              <h3 className="text-lg font-bold">Are you absolutely sure?</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Your data has been exported. Do you want to permanently delete
                your account? This action cannot be undone.
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline" onClick={resetDeleteFlow}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setDeleteStep("verify")}
                >
                  Delete Forever
                </Button>
              </div>
            </div>
          </Dialog>
        )}

        {isDeleteAccountModalOpen && deleteStep === "verify" && (
          <MasterPasswordVerificationDialog
            open={isDeleteAccountModalOpen}
            onClose={resetDeleteFlow}
            onSuccess={handleDeleteAccount}
          />
        )}

        {isResetModalOpen && (
          <Dialog
            open={isResetModalOpen}
            onClose={() => setIsResetModalOpen(false)}
          >
            <div className="p-6">
              <h3 className="text-lg font-bold">
                Reset Master Password?
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Are you sure you want to reset your master password? All your
                encrypted data will be permanently deleted. This action cannot
                be undone.
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsResetModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setIsResetModalOpen(false);
                    setIsResetVerificationOpen(true);
                  }}
                >
                  Reset and Wipe Data
                </Button>
              </div>
            </div>
          </Dialog>
        )}

        {isResetVerificationOpen && (
          <MasterPasswordVerificationDialog
            open={isResetVerificationOpen}
            onClose={() => setIsResetVerificationOpen(false)}
            onSuccess={handleResetMasterPassword}
          />
        )}

        {isChangePasswordModalOpen && (
          <Dialog
            open={isChangePasswordModalOpen}
            onClose={() => setIsChangePasswordModalOpen(false)}
          >
            <div className="p-6">
              <h3 className="text-lg font-bold">Change Password</h3>
              <div className="space-y-4 mt-4">
                <Input
                  type="password"
                  placeholder="Current Password"
                  value={passwords.current}
                  onChange={(e) =>
                    setPasswords({ ...passwords, current: e.target.value })
                  }
                />
                <Input
                  type="password"
                  placeholder="New Password"
                  value={passwords.new}
                  onChange={(e) =>
                    setPasswords({ ...passwords, new: e.target.value })
                  }
                />
                <Input
                  type="password"
                  placeholder="Confirm New Password"
                  value={passwords.confirm}
                  onChange={(e) =>
                    setPasswords({ ...passwords, confirm: e.target.value })
                  }
                />
                {passwordError && (
                  <p className="text-red-600 text-sm">{passwordError}</p>
                )}
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsChangePasswordModalOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button onClick={handleChangePassword} disabled={saving}>
                  {saving ? "Saving..." : "Save Password"}
                </Button>
              </div>
            </div>
          </Dialog>
        )}
        {isFolderModalOpen && (
          <Dialog
            open={isFolderModalOpen}
            onClose={() => setIsFolderModalOpen(false)}
          >
            <div className="p-6">
              <h3 className="text-lg font-bold">
                {editingFolder ? "Rename Folder" : "Create Folder"}
              </h3>
              <div className="space-y-4 mt-4">
                <Input
                  placeholder="Folder Name"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                />
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsFolderModalOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveFolder}
                  disabled={saving || !folderName}
                >
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          </Dialog>
        )}
        {isDeleteFolderModalOpen && (
          <Dialog
            open={isDeleteFolderModalOpen}
            onClose={() => setIsDeleteFolderModalOpen(false)}
          >
            <div className="p-6">
              <h3 className="text-lg font-bold">Delete Folder</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Are you sure you want to delete the folder &quot;
                {folderToDelete?.name}&quot;? This will not delete the
                credentials inside it.
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsDeleteFolderModalOpen(false)}
                  disabled={dangerLoading}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteFolder}
                  disabled={dangerLoading}
                >
                  {dangerLoading ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </div>
          </Dialog>
        )}
        <PasskeySetup
          isOpen={passkeySetupOpen}
          onClose={() => setPasskeySetupOpen(false)}
          userId={user?.$id || ""}
          isEnabled={passkeyEnabled}
          onSuccess={() => {
            if (user?.$id) {
              AppwriteService.hasPasskey(user.$id).then(setPasskeyEnabled);
            }
          }}
        />
      </div>
    </VaultGuard>
  );
}
