"use client";

import { useState } from "react";
import Dialog from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createTotpSecret } from "@/lib/appwrite";
import { useAppwrite } from "@/app/appwrite-provider";

export default function NewTotpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAppwrite();
  const [form, setForm] = useState({
    issuer: "",
    accountName: "",
    secretKey: "",
    folderId: "",
    algorithm: "SHA1",
    digits: 6,
    period: 30,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (!user) throw new Error("Not authenticated");
      await createTotpSecret({
        userId: user.$id,
        ...form,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      onClose();
    } catch (e: any) {
      setError(e.message || "Failed to add TOTP code.");
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <h2 className="text-xl font-bold mb-2">Add TOTP Code</h2>
        <div className="space-y-2">
          <label className="text-sm font-medium">Issuer</label>
          <Input
            value={form.issuer}
            onChange={e => setForm({ ...form, issuer: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Account Name</label>
          <Input
            value={form.accountName}
            onChange={e => setForm({ ...form, accountName: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Secret Key</label>
          <Input
            value={form.secretKey}
            onChange={e => setForm({ ...form, secretKey: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Digits</label>
          <Input
            type="number"
            value={form.digits}
            min={6}
            max={8}
            onChange={e => setForm({ ...form, digits: Number(e.target.value) })}
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Period (seconds)</label>
          <Input
            type="number"
            value={form.period}
            min={15}
            max={60}
            onChange={e => setForm({ ...form, period: Number(e.target.value) })}
            required
          />
        </div>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <div className="flex gap-2">
          <Button type="submit" className="flex-1" disabled={loading}>
            {loading ? "Adding..." : "Add"}
          </Button>
          <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
