"use client";

import { useState } from "react";

// Add advanced checkbox state

import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createTotpSecret, updateTotpSecret } from "@/lib/appwrite";
import { useAppwrite } from "@/app/appwrite-provider";
import { useEffect } from "react";
import toast from "react-hot-toast";
import { TotpSecrets } from "@/types/appwrite";

export default function NewTotpDialog({ open, onClose, initialData }: { open: boolean; onClose: () => void; initialData?: { $id?: string; issuer?: string | null; accountName?: string | null; secretKey?: string; period?: number | null; digits?: number | null; algorithm?: string | null; folderId?: string | null } }) {
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
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setForm({
        issuer: initialData.issuer || "",
        accountName: initialData.accountName || "",
        secretKey: initialData.secretKey || "",
        folderId: initialData.folderId || "",
        algorithm: initialData.algorithm || "SHA1",
        digits: initialData.digits || 6,
        period: initialData.period || 30,
      });
    } else {
      setForm({
        issuer: "",
        accountName: "",
        secretKey: "",
        folderId: "",
        algorithm: "SHA1",
        digits: 6,
        period: 30,
      });
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!user) throw new Error("Not authenticated");
       if (initialData && initialData.$id) {
         await updateTotpSecret(initialData.$id, {
          ...form,
          updatedAt: new Date().toISOString(),
        });
        toast.success("TOTP code updated!");
      } else {
        await createTotpSecret({
          userId: user.$id,
          ...form,
          url: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          $sequence: 0,
          $collectionId: "",
          $databaseId: "",
          $permissions: [],
        });
        toast.success("TOTP code added!");
      }
      onClose();
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast.error(err.message || `Failed to ${initialData ? 'update' : 'add'} TOTP code.`);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <h2 className="text-xl font-bold mb-2">{initialData ? 'Edit' : 'Add'} TOTP Code</h2>
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
        <div className="flex items-center space-x-2 pt-2">
          <input
            id="show-advanced"
            type="checkbox"
            checked={showAdvanced}
            onChange={() => setShowAdvanced(!showAdvanced)}
          />
          <label htmlFor="show-advanced" className="text-sm select-none cursor-pointer">Advanced</label>
        </div>
        {showAdvanced && (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">Digits</label>
              <Input
                type="number"
                value={form.digits}
                min={6}
                max={8}
                disabled
                readOnly
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
                disabled
                readOnly
                required
              />
            </div>
          </>
        )}
        <div className="flex gap-2">
          <Button type="submit" className="flex-1" disabled={loading}>
            {loading ? (initialData ? "Saving..." : "Adding...") : (initialData ? "Save" : "Add")}
          </Button>
          <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
