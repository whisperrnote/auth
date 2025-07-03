"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, RefreshCw, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useAppwrite } from "@/app/appwrite-provider";
import { createCredential, createFolder, createTotpSecret } from "@/lib/appwrite";
import { generateRandomPassword } from "@/utils/password";
import { masterPassCrypto } from "@/app/(protected)/masterpass/logic";

export default function NewCredentialPage() {
  const router = useRouter();
  const { user } = useAppwrite();
  const [showPassword, setShowPassword] = useState(false);
  const [customFields, setCustomFields] = useState<Array<{id: string, label: string, value: string}>>([]);
  const [formData, setFormData] = useState({
    type: "credential", // "credential" | "folder" | "totp" (future)
    name: "",
    url: "",
    username: "",
    password: "",
    notes: "",
    folder: "",
    tags: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setError(null);
    setLoading(true);
    
    try {
      if (!user?.$id) {
        throw new Error("Not authenticated");
      }

      // Check if vault is unlocked before proceeding
      if (!masterPassCrypto.isVaultUnlocked()) {
        throw new Error("Vault is locked. Please unlock your vault first.");
      }

      console.log('Form submission started:', formData.type);
      console.log('Vault unlocked:', masterPassCrypto.isVaultUnlocked());

      if (formData.type === "credential") {
        console.log('Creating credential with data:', {
          userId: user.$id,
          name: formData.name,
          username: formData.username,
          hasPassword: !!formData.password,
          // Don't log password for security
        });

        const credentialData = {
          userId: user.$id,
          name: formData.name,
          url: formData.url || null,
          username: formData.username,
          password: formData.password,
          notes: formData.notes || null,
          folderId: formData.folder || null,
          tags: formData.tags ? formData.tags.split(",").map(t => t.trim()) : [],
          customFields: customFields.length > 0 ? JSON.stringify(customFields) : null,
          faviconUrl: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        console.log('About to call createCredential...');
        const result = await createCredential(credentialData);
        console.log('Credential created successfully:', result);
        
        router.push("/dashboard");
      } else if (formData.type === "folder") {
        await createFolder({
          userId: user.$id,
          name: formData.name,
          parentFolderId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
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
        });
        router.push("/totp");
      }
    } catch (e: any) {
      console.error('Failed to save credential:', e);
      console.error('Error stack:', e.stack);
      setError(e.message || "Failed to save credential. Please check if your vault is unlocked.");
    }
    setLoading(false);
  };

  // Don't render if user is not available
  if (!user) {
    return (
      <div className="space-y-6">
        <div className="text-lg text-muted-foreground">Loading...</div>
      </div>
    );
  }

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
                    <Input
                      placeholder="Work, Personal, etc."
                      value={formData.folder}
                      onChange={(e) => setFormData({ ...formData, folder: e.target.value })}
                    />
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

            {error && <div className="text-red-600 text-sm">{error}</div>}

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
