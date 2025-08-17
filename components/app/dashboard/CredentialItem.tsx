import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Copy, Edit, Trash2, Eye, EyeOff } from "lucide-react";
import clsx from "clsx";

export default function CredentialItem({
  credential,
  onCopy,
  isDesktop,
  onEdit,
  onDelete,
  onClick,
}: {
  credential: any;
  onCopy: (value: string) => void;
  isDesktop: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onClick?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleCopy = (value: string) => {
    onCopy(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const getFaviconUrl = (url: string) => {
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
        "rounded-2xl overflow-hidden mb-3 backdrop-blur-md border border-[rgba(191,174,153,0.3)] shadow-sm cursor-pointer",
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
              {showPassword ? credential.password : "••••••••••••"}
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

            {isDesktop && (
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full h-9 w-9"
                onClick={e => { e.stopPropagation(); setShowPassword(!showPassword); }}
                title={showPassword ? "Hide Password" : "Show Password"}
              >{showPassword ? <EyeOff className="h-6 w-6 text-[rgb(141,103,72)]" /> : <Eye className="h-6 w-6 text-[rgb(141,103,72)]" />}</Button>
            )}

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
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full h-10 w-10"
                onClick={e => e.stopPropagation()}
                title="Copy"
              >
                <Copy className="h-6 w-6 text-[rgb(141,103,72)]" />
              </Button>
              <div className="absolute right-0 mt-2 w-40 bg-background border rounded-md shadow-md py-1 hidden" data-role="copy-menu">
                <button className="w-full text-left px-3 py-2 text-sm hover:bg-accent" onClick={e => { e.stopPropagation(); handleCopy(credential.username); }}>
                  Copy username
                </button>
                <button className="w-full text-left px-3 py-2 text-sm hover:bg-accent" onClick={e => { e.stopPropagation(); handleCopy(credential.password); }}>
                  Copy password
                </button>
              </div>
            </div>

            {/* More dropdown for edit/delete */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full h-10 w-10"
                onClick={e => e.stopPropagation()}
                title="More"
              >
                <svg className="h-6 w-6 text-[rgb(141,103,72)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="5" r="1.5" />
                  <circle cx="12" cy="12" r="1.5" />
                  <circle cx="12" cy="19" r="1.5" />
                </svg>
              </Button>
              <div className="absolute right-0 mt-2 w-36 bg-background border rounded-md shadow-md py-1 hidden" data-role="more-menu">
                <button className="w-full text-left px-3 py-2 text-sm hover:bg-accent" onClick={e => { e.stopPropagation(); onEdit(); }}>
                  Edit
                </button>
                <button className="w-full text-left px-3 py-2 text-sm text-destructive hover:bg-accent" onClick={e => { e.stopPropagation(); onDelete(); }}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>

        {copied && (
          <span className="ml-2 text-xs text-green-600 animate-fade-in-out">Copied!</span>
        )}
      </div>
    </div>
  );
}
