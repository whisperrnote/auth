import { useState, useEffect } from "react";
import Dialog from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createCredential, updateCredential } from "@/lib/appwrite";
import { useAppwrite } from "@/app/appwrite-provider";

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
  const [form, setForm] = useState({
    name: "",
    username: "",
    password: "",
    url: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initial) setForm(initial);
    else setForm({ name: "", username: "", password: "", url: "", notes: "" });
  }, [initial, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (!user) throw new Error("Not authenticated");
      if (initial && initial.$id) {
        await updateCredential(initial.$id, { ...form, updatedAt: new Date().toISOString() });
      } else {
        await createCredential({
          userId: user.$id,
          ...form,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
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
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <h2 className="text-xl font-bold mb-2">{initial ? "Edit" : "Add"} Credential</h2>
        <div className="space-y-2">
          <label className="text-sm font-medium">Name</label>
          <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Username</label>
          <Input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Password</label>
          <Input value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">URL</label>
          <Input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Notes</label>
          <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
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
