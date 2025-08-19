"use client";

import { useState, useEffect } from "react";
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
import { setVaultTimeout, getVaultTimeout } from "@/app/(protected)/masterpass/logic";
import { useAppwrite } from "@/app/appwrite-provider";
import TwofaSetup from "@/components/overlays/twofaSetup";
import { appwriteAccount, appwriteDatabases, APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_USER_ID, createFolder, updateFolder, deleteFolder, listFolders } from "@/lib/appwrite";
import { Query } from "appwrite";
import { updateUserProfile, exportAllUserData, deleteUserAccount } from "@/lib/appwrite";
import toast from "react-hot-toast";

import VaultGuard from "@/components/layout/VaultGuard";

// Hook to detect if sidebar is visible (desktop) or not (mobile)
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024); // Tailwind 'lg' breakpoint
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
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
  const [twofaEnabled, setTwofaEnabled] = useState(user?.twofa ?? false);
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Folder Management State
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<any | null>(null);
  const [folderName, setFolderName] = useState("");
  const [isDeleteFolderModalOpen, setIsDeleteFolderModalOpen] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<any | null>(null);
  // Folders list
  const [folders, setFolders] = useState<any[]>([]);

  // Load folders on mount
  useEffect(() => {
    const loadFolders = async () => {
      try {
        if (!user) return;
        const res = await listFolders(user.$id);
        // listFolders returns an array of folders; ensure we handle both array and object shapes
        const items = Array.isArray(res) ? res : (res && (res as any).documents ? (res as any).documents : (res && (res as any).items ? (res as any).items : []));
        setFolders(items);
      } catch (err) {
        console.error('Failed to load folders', err);
        setFolders([]);
      }
    };
    loadFolders();
  }, [user?.$id]);

  // Fetch latest 2fa status on mount and when dialog closes
  useEffect(() => {
    if (user?.userId || user?.$id) {
      fetchTwofaStatus();
    }
  }, [user?.userId, user?.$id, showTwofa]); // Add showTwofa to dependencies

  const fetchTwofaStatus = async () => {
    try {
      const userDoc = await appwriteDatabases.listDocuments(
        APPWRITE_DATABASE_ID,
        APPWRITE_COLLECTION_USER_ID,
        [Query.equal("userId", user?.userId || user?.$id)]
      );
      setTwofaEnabled(userDoc.documents[0]?.twofa === true);
    } catch (error) {
      console.error("Failed to fetch 2FA status:", error);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      if (!user) throw new Error("Not authenticated");
      // Only allow updating the name, not the email
      await updateUserProfile(user.$id, { name: profile.name });
      toast.success("Profile updated!");
    } catch (e: any) {
      toast.error(e.message || "Failed to update profile.");
    }
    setSaving(false);
  };

  const handleExportData = async () => {
    const toastId = toast.loading("Exporting data...");
    try {
      if (!user) throw new Error("Not authenticated");
      const data = await exportAllUserData(user.$id);
      // Download as JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "whisperrauth-export.json";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Data exported!", { id: toastId });
    } catch (e: any) {
      toast.error(e.message || "Failed to export data.", { id: toastId });
    }
  };

  const handleDeleteAccount = async () => {
    setDangerLoading(true);
    try {
      if (!user) throw new Error("Not authenticated");
      await deleteUserAccount(user.$id);
      toast.success("Account deleted.");
      setTimeout(() => {
        setDangerLoading(false);
        logout();
      }, 1500);
    } catch (e: any) {
      setDangerLoading(false);
      toast.error(e.message || "Failed to delete account.");
    } finally {
      setIsDeleteAccountModalOpen(false);
    }
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
    } catch (e: any) {
      setPasswordError(e.message || "Failed to update password.");
    }
    setSaving(false);
  };

  const handleSaveFolder = async () => {
    if (!folderName || !user) return;
    setSaving(true);
    try {
      if (editingFolder) {
        // Update existing folder
        const updatedFolder = await updateFolder(editingFolder.$id, { name: folderName });
        setFolders(folders.map(f => f.$id === editingFolder.$id ? updatedFolder : f));
        toast.success("Folder updated!");
      } else {
        // Create new folder
        const newFolder = await createFolder({ name: folderName, userId: user.$id } as any);
        setFolders([...folders, newFolder]);
        toast.success("Folder created!");
      }
      setIsFolderModalOpen(false);
      setEditingFolder(null);
      setFolderName("");
    } catch (e: any) {
      toast.error(e.message || "Failed to save folder.");
    }
    setSaving(false);
  };

  const openFolderModal = (folder: any | null = null) => {
    if (folder) {
      setEditingFolder(folder);
      setFolderName(folder.name);
    } else {
      setEditingFolder(null);
      setFolderName("");
    }
    setIsFolderModalOpen(true);
  };

  const openDeleteFolderModal = (folder: any) => {
    setFolderToDelete(folder);
    setIsDeleteFolderModalOpen(true);
  };

  const handleDeleteFolder = async () => {
    if (!folderToDelete || !user) return;
    setDangerLoading(true);
    try {
      await deleteFolder(folderToDelete.$id);
      setFolders(folders.filter(f => f.$id !== folderToDelete.$id));
      toast.success("Folder deleted!");
      setIsDeleteFolderModalOpen(false);
      setFolderToDelete(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to delete folder.");
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
                 />              </div>
              <Button
                onClick={handleSaveProfile}
                disabled={saving}
                className={clsx(
                  "transition-all duration-200",
                  saving && "opacity-70"
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
          <Card className="animate-fade-in-up" style={{ animationDelay: "60ms" }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full justify-start gap-2" onClick={() => setIsChangePasswordModalOpen(true)}>
                <Key className="h-4 w-4" />
                Change Password
              </Button>
              <Button
                variant={twofaEnabled ? "default" : "outline"}
                className="w-full justify-start gap-2"
                onClick={() => setShowTwofa(true)}
              >
                <Shield className="h-4 w-4" />
                {twofaEnabled ? "✅ Two-Factor Authentication Enabled" : "Setup Two-Factor Authentication"}
              </Button>
              
              {/* Vault Timeout Setting */}
              <div className="pt-4 border-t">
                <div className="space-y-3">
                  <label className="text-sm font-medium">Vault Auto-Lock Timeout</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[5, 10, 15, 30].map((minutes) => (
                      <Button
                        key={minutes}
                        variant={vaultTimeout === minutes ? "default" : "outline"}
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
                      onChange={(e) => handleVaultTimeoutChange(parseInt(e.target.value) || 10)}
                      className="w-20 text-sm"
                    />
                    <span className="text-xs text-muted-foreground">minutes</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Vault will auto-lock after {vaultTimeout} minutes of inactivity
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Theme Settings */}
          <Card className="animate-fade-in-up" style={{ animationDelay: "120ms" }}>
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
          <Card className="animate-fade-in-up" style={{ animationDelay: "180ms" }}>
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
                onClick={() => window.location.href = '/import'}
              >
                <Upload className="h-4 w-4" />
                Import Data
              </Button>
            </CardContent>
          </Card>

          {/* Folder Management */}
          <Card className="animate-fade-in-up" style={{ animationDelay: "240ms" }}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Folder className="h-5 w-5" />
                  Folder Management
                </span>
                <Button size="sm" onClick={() => openFolderModal()}>+ Add Folder</Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {folders.length > 0 ? folders.map(folder => (
                <div key={folder.$id} className="flex items-center justify-between p-2 rounded-md hover:bg-accent/50">
                  <span>{folder.name}</span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openFolderModal(folder)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openDeleteFolderModal(folder)}>
                      <Trash className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground">No folders created yet.</p>
              )}
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card
            className={clsx(
              "border-destructive animate-fade-in-up",
              dangerLoading && "opacity-70"
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
                    Permanently delete your account and all associated data. This action cannot be undone.
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
          user={user}
          onStatusChange={(enabled) => {
            setTwofaEnabled(enabled);
            // Also refresh from database to ensure consistency
            setTimeout(fetchTwofaStatus, 500);
          }}
        />
      )}
      {isDeleteAccountModalOpen && (
        <Dialog open={isDeleteAccountModalOpen} onClose={() => setIsDeleteAccountModalOpen(false)}>
          <div className="p-6">
            <h3 className="text-lg font-bold">Delete Account</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Are you sure you want to permanently delete your account and all of your data? This action cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDeleteAccountModalOpen(false)} disabled={dangerLoading}>Cancel</Button>
              <Button variant="destructive" onClick={handleDeleteAccount} disabled={dangerLoading}>
                {dangerLoading ? "Deleting..." : "Delete Account"}
              </Button>
            </div>
          </div>
        </Dialog>
      )}
      {isChangePasswordModalOpen && (
        <Dialog open={isChangePasswordModalOpen} onClose={() => setIsChangePasswordModalOpen(false)}>
          <div className="p-6">
            <h3 className="text-lg font-bold">Change Password</h3>
            <div className="space-y-4 mt-4">
              <Input
                type="password"
                placeholder="Current Password"
                value={passwords.current}
                onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
              />
              <Input
                type="password"
                placeholder="New Password"
                value={passwords.new}
                onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
              />
              <Input
                type="password"
                placeholder="Confirm New Password"
                value={passwords.confirm}
                onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
              />
              {passwordError && <p className="text-red-600 text-sm">{passwordError}</p>}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsChangePasswordModalOpen(false)} disabled={saving}>Cancel</Button>
              <Button onClick={handleChangePassword} disabled={saving}>
                {saving ? "Saving..." : "Save Password"}
              </Button>
            </div>
          </div>
        </Dialog>
      )}
      {isFolderModalOpen && (
        <Dialog open={isFolderModalOpen} onClose={() => setIsFolderModalOpen(false)}>
          <div className="p-6">
            <h3 className="text-lg font-bold">{editingFolder ? "Rename Folder" : "Create Folder"}</h3>
            <div className="space-y-4 mt-4">
              <Input
                placeholder="Folder Name"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsFolderModalOpen(false)} disabled={saving}>Cancel</Button>
              <Button onClick={handleSaveFolder} disabled={saving || !folderName}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </Dialog>
      )}
      {isDeleteFolderModalOpen && (
        <Dialog open={isDeleteFolderModalOpen} onClose={() => setIsDeleteFolderModalOpen(false)}>
          <div className="p-6">
            <h3 className="text-lg font-bold">Delete Folder</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Are you sure you want to delete the folder "{folderToDelete?.name}"? This will not delete the credentials inside it.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDeleteFolderModalOpen(false)} disabled={dangerLoading}>Cancel</Button>
              <Button variant="destructive" onClick={handleDeleteFolder} disabled={dangerLoading}>
                {dangerLoading ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
    </VaultGuard>
   );}
