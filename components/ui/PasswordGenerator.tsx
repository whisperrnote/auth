"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  Copy,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Clock,
} from "lucide-react";
import { generateRandomPassword } from "@/utils/password";

export default function PasswordGenerator() {
  const [length, setLength] = useState(16);
  const [password, setPassword] = useState(() => generateRandomPassword(16));
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<{ value: string; ts: number }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);

  // Live update password as length changes
  useEffect(() => {
    const newPassword = generateRandomPassword(length);
    setPassword(newPassword);
    // Don't add to history on slider move, only on explicit generate
  }, [length]);

  // Do not persist history to storage to avoid leaking plaintext
  // If persistence is needed, implement secure, per-session encryption.
  useEffect(() => {
    // Intentionally left blank
  }, [history]);

  const handleGenerate = () => {
    const newPassword = generateRandomPassword(length);
    setPassword(newPassword);
    setCopied(false);
    // Add to history (store plaintext, encrypt during save)
    setHistory((prev: { value: string; ts: number }[]) => {
      const next = [{ value: newPassword, ts: Date.now() }, ...prev];
      return next.slice(0, 20);
    });
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const handleLengthChange = (val: number) => {
    if (val < 8) val = 8;
    if (val > 64) val = 64;
    setLength(val);
  };

  return (
    <div className="w-full sm:max-w-[380px] max-w-xs p-2 bg-card rounded-md shadow-md">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between mb-1">
          <span className="font-semibold text-base">Password Generator</span>
          {/* mobile-only showHistory folded down */}
          <label className="hidden sm:flex items-center gap-1 text-xs cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showHistory}
              onChange={(e) => setShowHistory(e.target.checked)}
              className="accent-primary"
            />
            <span className="sm:inline hidden">Show history</span>
          </label>
        </div>
        {/* mobile: folded showHistory below title */}
        <div className="sm:hidden">
          <label className="flex items-center gap-2 text-xs cursor-pointer mt-1">
            <input
              type="checkbox"
              checked={showHistory}
              onChange={(e) => setShowHistory(e.target.checked)}
              className="accent-primary"
            />
            <span>Show history</span>
          </label>
        </div>
        <div>
          {/* Mobile: vertical layout */}
          <div className="sm:hidden flex flex-col gap-2 items-stretch w-full">
            <div className="flex items-center gap-2">
              <textarea
                className="font-mono text-base flex-1 bg-muted/50 cursor-default select-all rounded px-2 py-1 min-h-[2.5rem] resize-none text-left"
                value={password}
                readOnly
                rows={2}
                aria-label="Generated password"
                style={{ wordBreak: "break-word" }}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopy}
                title="Copy password"
                className="p-1 h-8 w-8 flex-shrink-0"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGenerate}
                title="Rotate password"
                className="p-1 h-8 w-8"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {/* Desktop: horizontal layout as before */}
          <div className="hidden sm:flex flex-row gap-2 w-full items-center">
            <div className="flex-1 relative items-center">
              <Input
                ref={inputRef}
                type="text"
                value={password}
                readOnly
                className="font-mono text-base w-full bg-muted/50 cursor-default select-all"
                aria-label="Generated password"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  title="Copy password"
                  className="p-1 h-7 w-7"
                >
                  <Copy className="h-4 w-4" />
                  {copied && <span className="ml-1 text-xs">Copied!</span>}
                </Button>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGenerate}
              title="Generate new password"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs">Length</span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => handleLengthChange(length - 1)}
              disabled={length <= 8}
              className="px-2"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Input
              type="number"
              min={8}
              max={64}
              value={length}
              onChange={(e) => handleLengthChange(Number(e.target.value))}
              className="w-16 text-center font-mono text-base px-1 py-1 h-8"
              style={{ minWidth: 0 }}
            />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => handleLengthChange(length + 1)}
              disabled={length >= 64}
              className="px-2"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <input
            id="password-length"
            type="range"
            min={8}
            max={64}
            value={length}
            onChange={(e) => handleLengthChange(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <Button
            type="button"
            onClick={handleGenerate}
            className="w-full mt-1"
          >
            Generate
          </Button>
        </div>
        {showHistory && (
          <div className="mt-2 max-h-40 overflow-y-auto border-t pt-2">
            <div className="flex items-center gap-1 mb-1 text-xs text-muted-foreground font-semibold">
              <Clock className="h-3 w-3" /> Last 20 passwords
            </div>
            {history.length === 0 ? (
              <div className="text-xs text-muted-foreground">
                No history yet.
              </div>
            ) : (
              <ul className="space-y-1">
                {history.map(
                  (item: { value: string; ts: number }, i: number) => (
                    <li
                      key={i}
                      className="flex items-center gap-2 text-xs font-mono bg-muted/30 rounded px-2 py-1"
                    >
                      <span className="truncate flex-1" title={item.value}>
                        {item.value}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(item.ts).toLocaleTimeString()}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          navigator.clipboard.writeText(item.value);
                        }}
                        title="Copy"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </li>
                  ),
                )}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
