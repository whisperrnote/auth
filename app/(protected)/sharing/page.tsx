"use client";

import { useState } from "react";
import { UserPlus, Users, Mail, Copy, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import clsx from "clsx";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[22px] font-bold text-[rgb(141,103,72)] mb-2 drop-shadow-sm">
      {children}
    </h2>
  );
}

function SharingInviteForm({ onInvite, loading }: { onInvite: (email: string) => void; loading: boolean }) {
  const [email, setEmail] = useState("");
  return (
    <form
      className="flex gap-2 items-center"
      onSubmit={e => {
        e.preventDefault();
        if (email) onInvite(email);
      }}
    >
      <input
        type="email"
        className="flex-1 rounded-full px-4 py-2 border border-[rgba(191,174,153,0.4)] bg-white/60 outline-none text-base"
        placeholder="Invite by email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
      />
      <Button
        type="submit"
        className="rounded-full px-5"
        disabled={loading}
      >
        {loading ? <Loader2 className="animate-spin h-5 w-5" /> : <><Plus className="h-5 w-5 mr-1" />Invite</>}
      </Button>
    </form>
  );
}

function InviteItem({ email, status, onCopy }: { email: string; status: string; onCopy: () => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/70 border border-[rgba(191,174,153,0.3)] mb-2 shadow-sm">
      <div className="flex items-center gap-3">
        <Mail className="h-5 w-5 text-[rgb(141,103,72)]" />
        <span className="font-medium text-[rgb(141,103,72)]">{email}</span>
        <span className={clsx(
          "ml-2 text-xs font-semibold px-2 py-1 rounded",
          status === "pending"
            ? "bg-yellow-100 text-yellow-800"
            : status === "accepted"
            ? "bg-green-100 text-green-800"
            : "bg-gray-100 text-gray-800"
        )}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="rounded-full"
        onClick={onCopy}
        aria-label="Copy invite link"
      >
        <Copy className="h-5 w-5 text-[rgb(141,103,72)]" />
      </Button>
    </div>
  );
}

function SharedWithItem({ name, email }: { name: string; email: string }) {
  return (
    <div className="flex items-center px-4 py-3 rounded-xl bg-white/70 border border-[rgba(191,174,153,0.3)] mb-2 shadow-sm">
      <Users className="h-5 w-5 text-[rgb(141,103,72)] mr-3" />
      <span className="font-medium text-[rgb(141,103,72)]">{name}</span>
      <span className="ml-2 text-sm text-[rgb(191,174,153)]">{email}</span>
    </div>
  );
}

export default function SharingPage() {
  const [invites, setInvites] = useState([]);
  const [sharedWith, setSharedWith] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const handleInvite = (email: string) => {
    setLoading(true);
    setTimeout(() => {
      setInvites([{ email, status: "pending" }, ...invites]);
      setLoading(false);
    }, 1000);
  };

  const handleCopy = (email: string) => {
    navigator.clipboard.writeText(`https://auth.whisperrnote.space/login?email=${encodeURIComponent(email)}`);
    setCopied(email);
    setTimeout(() => setCopied(null), 1200);
  };

  return (
    <VaultGuard>
      <div className="w-full min-h-screen bg-[rgb(245,239,230)] flex flex-col">
      <div className="w-full max-w-2xl mx-auto px-4 md:px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <UserPlus className="h-8 w-8 text-[rgb(141,103,72)]" />
          <h1 className="text-3xl font-bold text-[rgb(141,103,72)] drop-shadow-md">Sharing Center</h1>
        </div>
        {/* Invite Form */}
        <div className="mb-8">
          <SectionTitle>Invite Someone</SectionTitle>
          <SharingInviteForm onInvite={handleInvite} loading={loading} />
        </div>
        {/* Pending/Accepted Invites */}
        <div className="mb-8">
          <SectionTitle>Pending Invitations</SectionTitle>
          {invites.length === 0 && (
            <div className="text-muted-foreground text-sm py-4">No invitations sent yet.</div>
          )}
          {invites.map(invite => (
            <InviteItem
              key={invite.email}
              email={invite.email}
              status={invite.status}
              onCopy={() => handleCopy(invite.email)}
            />
          ))}
          {copied && (
            <div className="text-green-700 text-xs mt-2 animate-fade-in-out">
              Invite link copied!
            </div>
          )}
        </div>
        {/* Shared With */}
        <div>
          <SectionTitle>Shared With</SectionTitle>
          {sharedWith.length === 0 && (
            <div className="text-muted-foreground text-sm py-4">No one has access yet.</div>
          )}
          {sharedWith.map(person => (
            <SharedWithItem key={person.email} name={person.name} email={person.email} />
          ))}
        </div>
      </div>
    </div>
  );
}
