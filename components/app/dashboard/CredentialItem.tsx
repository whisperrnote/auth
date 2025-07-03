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
}: {
  credential: any;
  onCopy: (value: string) => void;
  isDesktop: boolean;
  onEdit: () => void;
  onDelete: () => void;
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
        "rounded-2xl overflow-hidden mb-3 backdrop-blur-md border border-[rgba(191,174,153,0.3)] shadow-sm",
        "bg-white/55 transition-shadow hover:shadow-lg"
      )}
      style={{ boxShadow: "0 4px 12px 0 rgba(141,103,72,0.10)" }}
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

        <div className="flex items-center gap-1">
          {/* Copy Username */}
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full h-8 w-8"
            onClick={() => handleCopy(credential.username)}
            title="Copy Username"
          >
            <Copy className="h-4 w-4 text-[rgb(141,103,72)]" />
          </Button>

          {/* Copy Password */}
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full h-8 w-8"
            onClick={() => handleCopy(credential.password)}
            title="Copy Password"
          >
            <Copy className="h-4 w-4 text-blue-600" />
          </Button>

          {/* Show/Hide Password (Desktop) */}
          {isDesktop && (
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-8 w-8"
              onClick={() => setShowPassword(!showPassword)}
              title={showPassword ? "Hide Password" : "Show Password"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4 text-[rgb(141,103,72)]" />
              ) : (
                <Eye className="h-4 w-4 text-[rgb(141,103,72)]" />
              )}
            </Button>
          )}

          {/* Edit */}
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full h-8 w-8"
            onClick={onEdit}
            title="Edit"
          >
            <Edit className="h-4 w-4 text-orange-600" />
          </Button>

          {/* Delete */}
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full h-8 w-8"
            onClick={onDelete}
            title="Delete"
          >
            <Trash2 className="h-4 w-4 text-red-600" />
          </Button>
        </div>

        {copied && (
          <span className="ml-2 text-xs text-green-600 animate-fade-in-out">Copied!</span>
        )}
      </div>
    </div>
  );
}
