import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Copy, Edit, Trash2 } from "lucide-react";
import clsx from "clsx";

const MENU_EVENT = "credential-menu-open";

import type { Credentials } from "@/types/appwrite.d";
function MobileCopyMenu({ credential, onCopy }: { credential: Credentials; onCopy: (v: string) => void; }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuStyle, setMenuStyle] = useState<{ top: number; left: number } | null>(null);
  const idRef = useRef<string>(`menu-${Math.random().toString(36).slice(2,9)}`);

  useEffect(() => {
    function onMenuEvent(e: Event) {
      const detail = (e as CustomEvent).detail as { id: string } | undefined;
      if (!detail) return;
      if (detail.id !== idRef.current) setOpen(false);
    }
    window.addEventListener(MENU_EVENT, onMenuEvent as EventListener);
    return () => window.removeEventListener(MENU_EVENT, onMenuEvent as EventListener);
  }, []);

  useEffect(() => {
    if (!open) return;
    
    const updatePosition = () => {
      if (!btnRef.current) return;
      const rect = btnRef.current.getBoundingClientRect();
      setMenuStyle({ top: rect.bottom + 4, left: rect.left });
    };
    
    function handleDocClick(e: MouseEvent) {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || btnRef.current?.contains(target)) return;
      setOpen(false);
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function handleScroll() {
      updatePosition();
    }
    
    updatePosition();
    
    document.addEventListener("mousedown", handleDocClick);
    document.addEventListener("keydown", handleEsc);
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });
    
    window.dispatchEvent(new CustomEvent(MENU_EVENT, { detail: { id: idRef.current } }));
    
    return () => {
      document.removeEventListener("mousedown", handleDocClick);
      document.removeEventListener("keydown", handleEsc);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [open]);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(o => !o);
    if (!open) window.dispatchEvent(new CustomEvent(MENU_EVENT, { detail: { id: idRef.current } }));
  };

  return (
    <div className="relative">
      <Button ref={btnRef as any} variant="ghost" size="sm" className="rounded-full h-10 w-10" onClick={toggle} title="Copy">
        <Copy className="h-6 w-6 text-[rgb(141,103,72)]" />
      </Button>
      {open && typeof document !== "undefined" && createPortal(
        <div ref={menuRef as any} className="fixed z-[99999] bg-background border rounded-md shadow-md py-1 w-44" style={{ top: menuStyle?.top ?? 0, left: menuStyle?.left ?? 0 }}>
          <button className="w-full text-left px-3 py-2 text-sm hover:bg-accent" onClick={e => { e.stopPropagation(); onCopy(credential.username); setOpen(false); }}>
            Copy username
          </button>
          <button className="w-full text-left px-3 py-2 text-sm hover:bg-accent" onClick={e => { e.stopPropagation(); onCopy(credential.password); setOpen(false); }}>
            Copy password
          </button>
        </div>, document.body)
      }
    </div>
  );
}

function MobileMoreMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuStyle, setMenuStyle] = useState<{ top: number; left: number } | null>(null);
  const idRef = useRef<string>(`menu-${Math.random().toString(36).slice(2,9)}`);

  useEffect(() => {
    function onMenuEvent(e: Event) {
      const detail = (e as CustomEvent).detail as { id: string } | undefined;
      if (!detail) return;
      if (detail.id !== idRef.current) setOpen(false);
    }
    window.addEventListener(MENU_EVENT, onMenuEvent as EventListener);
    return () => window.removeEventListener(MENU_EVENT, onMenuEvent as EventListener);
  }, []);

  useEffect(() => {
    if (!open) return;
    
    const updatePosition = () => {
      if (!btnRef.current) return;
      const rect = btnRef.current.getBoundingClientRect();
      setMenuStyle({ top: rect.bottom + 4, left: rect.left });
    };
    
    function handleDocClick(e: MouseEvent) {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || btnRef.current?.contains(target)) return;
      setOpen(false);
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function handleScroll() {
      updatePosition();
    }
    
    updatePosition();
    
    document.addEventListener("mousedown", handleDocClick);
    document.addEventListener("keydown", handleEsc);
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });
    
    window.dispatchEvent(new CustomEvent(MENU_EVENT, { detail: { id: idRef.current } }));
    
    return () => {
      document.removeEventListener("mousedown", handleDocClick);
      document.removeEventListener("keydown", handleEsc);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [open]);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(o => !o);
    if (!open) window.dispatchEvent(new CustomEvent(MENU_EVENT, { detail: { id: idRef.current } }));
  };

  return (
    <div className="relative">
      <Button ref={btnRef as any} variant="ghost" size="sm" className="rounded-full h-10 w-10" onClick={toggle} title="More">
        <svg className="h-6 w-6 text-[rgb(141,103,72)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="5" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="12" cy="19" r="1.5" />
        </svg>
      </Button>
      {open && typeof document !== "undefined" && createPortal(
        <div ref={menuRef as any} className="fixed z-[99999] bg-background border rounded-md shadow-md py-1 w-36" style={{ top: menuStyle?.top ?? 0, left: menuStyle?.left ?? 0 }}>
          <button className="w-full text-left px-3 py-2 text-sm hover:bg-accent" onClick={e => { e.stopPropagation(); onEdit(); setOpen(false); }}>
            Edit
          </button>
          <button className="w-full text-left px-3 py-2 text-sm text-destructive hover:bg-accent" onClick={e => { e.stopPropagation(); onDelete(); setOpen(false); }}>
            Delete
          </button>
        </div>, document.body)
      }
    </div>
  );
}

export default function CredentialItem({
  credential,
  onCopy,
  isDesktop,
  onEdit,
  onDelete,
  onClick,
}: {
  credential: Credentials;
  onCopy: (value: string) => void;
  isDesktop: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onClick?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (value: string) => {
    onCopy(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const getFaviconUrl = (url: string | null) => {
    if (!url) return null;
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch {
      return null;
    }
  };

  const faviconUrl = getFaviconUrl(credential.url);

  return (
    <div
      className={clsx(
        "rounded-2xl overflow-visible mb-3 backdrop-blur-md border border-[rgba(191,174,153,0.3)] shadow-sm cursor-pointer",
        "bg-white/55 transition-shadow hover:shadow-lg dark:bg-[rgba(141,103,72,0.14)] dark:border-none dark:shadow-none"
      )}
      style={{ boxShadow: "0 4px 12px 0 rgba(141,103,72,0.10)" }}
      onClick={onClick}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? "button" : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") onClick(); } : undefined}
    >
      <div className="flex items-center px-4 py-3">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-[rgba(191,174,153,0.7)] flex items-center justify-center overflow-hidden">
            {faviconUrl ? (
              <img src={faviconUrl} alt="" className="w-6 h-6" />
            ) : (
              <span className="text-[rgb(141,103,72)] font-bold text-sm">
                {credential.name?.charAt(0)?.toUpperCase() || "?"}
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 ml-4 min-w-0">
          <div className="font-semibold text-[rgb(141,103,72)] truncate">{credential.name}</div>
          <div className="text-[13px] text-[rgb(191,174,153)] truncate">{credential.username}</div>
          {isDesktop && (
            <div className="text-[11px] text-[rgb(191,174,153)] font-mono mt-1">
              ••••••••••••
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Desktop controls: larger icons kept */}
          <div className="hidden sm:flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full h-9 w-9"
              onClick={e => { e.stopPropagation(); handleCopy(credential.username); }}
              title="Copy Username"
            ><Copy className="h-6 w-6 text-[rgb(141,103,72)]" /></Button>

            <Button
              variant="ghost"
              size="sm"
              className="rounded-full h-9 w-9"
              onClick={e => { e.stopPropagation(); handleCopy(credential.password); }}
              title="Copy Password"
            ><Copy className="h-6 w-6 text-blue-600" /></Button>

            <Button
              variant="ghost"
              size="sm"
              className="rounded-full h-9 w-9"
              onClick={e => { e.stopPropagation(); onEdit(); }}
              title="Edit"
            ><Edit className="h-6 w-6 text-orange-600" /></Button>

            <Button
              variant="ghost"
              size="sm"
              className="rounded-full h-9 w-9"
              onClick={e => { e.stopPropagation(); onDelete(); }}
              title="Delete"
            ><Trash2 className="h-6 w-6 text-red-600" /></Button>
          </div>

          {/* Mobile grouped controls */}
          <div className="flex sm:hidden items-center gap-2">
            {/* Copy dropdown */}
            <MobileCopyMenu credential={credential} onCopy={handleCopy} />

            {/* More dropdown for edit/delete */}
            <MobileMoreMenu onEdit={onEdit} onDelete={onDelete} />
          </div>
        </div>

        {copied && (
          <span className="ml-2 text-xs text-green-600 animate-fade-in-out">Copied!</span>
        )}
      </div>
    </div>
  );
}