"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, RefreshCw, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useAppwrite } from "@/app/appwrite-provider";
import { createCredential, createFolder, createTotpSecret, listFolders } from "@/lib/appwrite";
import type { Folders, Credentials, TotpSecrets } from "@/types/appwrite.d";
import { generateRandomPassword } from "@/utils/password";
import { masterPassCrypto } from "@/app/(protected)/masterpass/logic";
import toast from "react-hot-toast";
import VaultGuard from "@/components/layout/VaultGuard";
import { useEffect } from "react";


export default function NewCredentialPage() {
  const router = useRouter();
  const { user } = useAppwrite();
  const [showPassword, setShowPassword] = useState(false);
  const [customFields, setCustomFields] = useState<Array<{id: string, label: string, value: string}>>([]);
  const [folders, setFolders] = useState<Folders[]>([]);
  const [formData, setFormData] = useState({
    type: "credential" as "credential" | "folder" | "totp",
    name: "",
    url: "",
    username: "",
    password: "",
    notes: "",
    folder: "",
    tags: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.$id) {
      listFolders(user.$id).then(setFolders).catch(() => {
        toast.error("Could not load folders.");
      });
    }
  }, [user]);

  const handleGeneratePassword = () => {
    setFormData({ ...formData, password: generateRandomPassword(16) });
  };

  const addCustomField = () => {
    setCustomFields([...customFields, { id: Date.now().toString(), label: "", value: "" }]);
  };

  const updateCustomField = (id: string, field: "label" | "value", value: string) => {
    setCustomFields(customFields.map(cf => 
      cf.id === id ? { ...cf, [field]: value } : cf
    ));
  };

  const removeCustomField = (id: string) => {
    setCustomFields(customFields.filter(cf => cf.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (!user?.$id) {
        throw new Error("Not authenticated");
      }

      // Check if vault is unlocked before proceeding
      if (!masterPassCrypto.isVaultUnlocked()) {
        throw new Error("Vault is locked. Please unlock your vault first.");
      }

      if (formData.type === "credential") {
        // Clean and prepare credential data with proper null handling
         const credentialData: Pick<Credentials, 'userId'|'name'|'url'|'username'|'notes'|'folderId'|'tags'|'customFields'|'faviconUrl'|'createdAt'|'updatedAt'|'password'> = {
          userId: user.$id,
          name: formData.name.trim(),
          url: null,
          username: formData.username.trim(),
          notes: null,
          folderId: null,
          tags: null,
          customFields: null,
          faviconUrl: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          password: formData.password.trim(),
        };
        if (formData.url && formData.url.trim()) credentialData.url = formData.url.trim();
        if (formData.notes && formData.notes.trim()) credentialData.notes = formData.notes.trim();
        if (formData.folder && formData.folder.trim()) credentialData.folderId = formData.folder.trim();
        if (formData.tags && formData.tags.trim()) {
          const tagsArr = formData.tags.split(",").map(t => t.trim()).filter(t => t.length > 0);
          if (tagsArr.length > 0) credentialData.tags = tagsArr;
        }
        if (customFields.length > 0) credentialData.customFields = JSON.stringify(customFields);

        await createCredential(credentialData as Omit<Credentials, '$id' | '$createdAt' | '$updatedAt'>);
        toast.success("Credential created!");
        router.push("/dashboard");
      } else if (formData.type === "folder") {
        await createFolder({
          userId: user.$id,
          name: formData.name,
          parentFolderId: null,
          // createdAt/updatedAt are server-managed; omit to avoid type clashes
        } as unknown as Omit<Folders, '$id' | '$createdAt' | '$updatedAt'>);
        toast.success("Folder created!");
        router.push("/dashboard");
      } else if (formData.type === "totp") {
        // Check vault for TOTP as well
        if (!masterPassCrypto.isVaultUnlocked()) {
          throw new Error("Vault is locked. Please unlock your vault first.");
        }
        
        await createTotpSecret({
          userId: user.$id,
          issuer: formData.name,
          accountName: formData.username,
          secretKey: formData.password,
          folderId: formData.folder || null,
          algorithm: "SHA1",
          digits: 6,
          period: 30,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          url: null,
        } as Omit<TotpSecrets, '$id' | '$createdAt' | '$updatedAt'>);
        toast.success("TOTP code added!");
        router.push("/totp");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to save. Please check if your vault is unlocked.");
    }
    setLoading(false);
  };

  // Don't render if user is not available
  if (!user) {
   return (
    <VaultGuard>
      <div className="space-y-6">        <div className="text-lg text-muted-foreground">Loading...</div>
    </div>
    </VaultGuard>
   );  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {formData.type === "credential" ? "Add Credential" : "Add Folder"}
          </h1>
          <p className="text-muted-foreground">
            {formData.type === "credential"
              ? "Store a new password securely"
              : "Organize your credentials"}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {formData.type === "credential" ? "Credential Details" : "Folder Details"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Type Switcher */}
            <div className="flex gap-2 mb-2">
              <Button
                type="button"
                variant={formData.type === "credential" ? "default" : "outline"}
                onClick={() => setFormData(f => ({ ...f, type: "credential" }))}
              >
                Password
              </Button>
              <Button
                type="button"
                variant={formData.type === "folder" ? "default" : "outline"}
                onClick={() => setFormData(f => ({ ...f, type: "folder" }))}
              >
                Folder
              </Button>
              {/* Add TOTP option here if needed */}
            </div>

            {formData.type === "credential" ? (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Name *</label>
                    <Input
                      placeholder="e.g., GitHub, Gmail"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Website URL</label>
                    <Input
                      type="url"
                      placeholder="https://example.com"
                      value={formData.url}
                      onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Username/Email *</label>
                  <Input
                    placeholder="john@example.com"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Password *</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter or generate password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <Button type="button" variant="outline" onClick={handleGeneratePassword}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Folder</label>
                    <select
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={formData.folder}
                      onChange={(e) => setFormData({ ...formData, folder: e.target.value })}
                    >
                      <option value="">No Folder</option>
                      {folders.map(folder => (
                        <option key={folder.$id} value={folder.$id}>{folder.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tags</label>
                    <Input
                      placeholder="Comma separated: work, email, important"
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Notes</label>
                  <textarea
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder="Additional notes or information"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>

                {/* Custom Fields */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Custom Fields</label>
                    <Button type="button" variant="outline" size="sm" onClick={addCustomField}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Field
                    </Button>
                  </div>
                  {customFields.map((field) => (
                    <div key={field.id} className="flex gap-2">
                      <Input
                        placeholder="Field name"
                        value={field.label}
                        onChange={(e) => updateCustomField(field.id, "label", e.target.value)}
                      />
                      <Input
                        placeholder="Field value"
                        value={field.value}
                        onChange={(e) => updateCustomField(field.id, "value", e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCustomField(field.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              // Folder creation
              <div className="space-y-2">
                <label className="text-sm font-medium">Folder Name *</label>
                <Input
                  placeholder="e.g., Work, Personal"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading
                  ? "Saving..."
                  : formData.type === "credential"
                  ? "Save Credential"
                  : "Save Folder"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
