import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Copy } from "lucide-react";
import clsx from "clsx";

export default function CredentialItem({
  credential,
  onCopy,
  isDesktop,
}: {
  credential: any;
  onCopy: (value: string) => void;
  isDesktop: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopy(credential.password);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

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
          <div className="w-10 h-10 rounded-full bg-[rgba(191,174,153,0.7)] flex items-center justify-center">
            <span>
              <svg width="24" height="24" fill="none">
                <circle cx="12" cy="12" r="12" fill="#BFAE99" />
                <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-3.31 0-6 1.34-6 3v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-1c0-1.66-2.69-3-6-3Z" fill="#8D6748"/>
              </svg>
            </span>
          </div>
        </div>
        <div className="flex-1 ml-4">
          <div className="font-semibold text-[rgb(141,103,72)]">{credential.name}</div>
          <div className="text-[13px] font-mono text-[rgb(191,174,153)]">{credential.username}</div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={handleCopy}
            aria-label="Copy"
          >
            <Copy className="h-5 w-5 text-[rgb(141,103,72)]" />
          </Button>
          {isDesktop && (
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={handleCopy}
              aria-label="Copy"
            >
              <Copy className="h-5 w-5 text-[rgb(141,103,72)]" />
            </Button>
          )}
        </div>
        {copied && (
          <span className="ml-2 text-xs text-green-600 animate-fade-in-out">Copied!</span>
        )}
      </div>
    </div>
  );
}
