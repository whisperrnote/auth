import { useState, useEffect } from "react";
import { Eye, EyeOff, RefreshCw, Plus, X } from "lucide-react";
import Dialog from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createCredential, updateCredential } from "@/lib/appwrite";
import { useAppwrite } from "@/app/appwrite-provider";
import { generateRandomPassword } from "@/utils/password";

export default function CredentialDialog({
  open,
  onClose,
  initial,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  initial?: any;
  onSaved: () => void;
}) {
  const { user } = useAppwrite();
  const [showPassword, setShowPassword] = useState(false);
  const [customFields, setCustomFields] = useState<Array<{id: string, label: string, value: string}>>([]);
  const [form, setForm] = useState({
    name: "",
    username: "",
    password: "",
    url: "",
    notes: "",
    tags: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initial) {
      setForm({
        name: initial.name || "",
        username: initial.username || "",
        password: initial.password || "",
        url: initial.url || "",
        notes: initial.notes || "",
        tags: initial.tags ? initial.tags.join(", ") : "",
      });
      setCustomFields(initial.customFields ? JSON.parse(initial.customFields) : []);
    } else {
      setForm({ name: "", username: "", password: "", url: "", notes: "", tags: "" });
      setCustomFields([]);
    }
  }, [initial, open]);

  const handleGeneratePassword = () => {
    setForm({ ...form, password: generateRandomPassword(16) });
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
      if (!user) throw new Error("Not authenticated");

      // Clean and prepare credential data with proper null handling
      const credentialData: any = {
        name: form.name.trim(),
        username: form.username.trim(),
        password: form.password.trim(),
        createdAt: initial && initial.createdAt ? initial.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      if (form.url && form.url.trim()) credentialData.url = form.url.trim();
      if (form.notes && form.notes.trim()) credentialData.notes = form.notes.trim();
      if (form.tags && form.tags.trim()) {
        const tagsArr = form.tags.split(",").map(t => t.trim()).filter(t => t.length > 0);
        if (tagsArr.length > 0) credentialData.tags = tagsArr;
      }
      if (customFields.length > 0) credentialData.customFields = JSON.stringify(customFields);

      if (initial && initial.$id) {
        await updateCredential(initial.$id, credentialData);
      } else {
        await createCredential({
          userId: user.$id,
          ...credentialData,
          folderId: null,
          faviconUrl: null,
        });
      }
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message || "Failed to save credential.");
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-6 space-y-4 max-w-md w-full">
        <h2 className="text-xl font-bold mb-2">{initial ? "Edit" : "Add"} Credential</h2>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Name *</label>
          <Input 
            placeholder="e.g., GitHub, Gmail"
            value={form.name} 
            onChange={e => setForm({ ...form, name: e.target.value })} 
            required 
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Username/Email *</label>
          <Input 
            placeholder="john@example.com"
            value={form.username} 
            onChange={e => setForm({ ...form, username: e.target.value })} 
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
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
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

        <div className="space-y-2">
          <label className="text-sm font-medium">Website URL</label>
          <Input 
            type="url"
            placeholder="https://example.com"
            value={form.url} 
            onChange={e => setForm({ ...form, url: e.target.value })} 
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Tags</label>
          <Input 
            placeholder="Comma separated: work, email, important"
            value={form.tags} 
            onChange={e => setForm({ ...form, tags: e.target.value })} 
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Notes</label>
          <textarea
            className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
            placeholder="Additional notes"
            value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })}
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

        {error && <div className="text-red-600 text-sm">{error}</div>}
        
        <div className="flex gap-2">
          <Button type="submit" className="flex-1" disabled={loading}>
            {loading ? "Saving..." : initial ? "Update" : "Add"}
          </Button>
          <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
