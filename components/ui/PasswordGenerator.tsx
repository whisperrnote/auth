"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Copy, RefreshCw, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { generateRandomPassword } from "@/utils/password";

export default function PasswordGenerator() {
  const [length, setLength] = useState(16);
  const [password, setPassword] = useState(() => generateRandomPassword(16));
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        return JSON.parse(localStorage.getItem("password_history") || "[]");
      } catch {
        return [];
      }
    }
    return [];
  });
  const inputRef = useRef<HTMLInputElement>(null);

  // Live update password as length changes
  useEffect(() => {
    const newPassword = generateRandomPassword(length);
    setPassword(newPassword);
    // Don't add to history on slider move, only on explicit generate
  }, [length]);

  // Store history in localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("password_history", JSON.stringify(history));
    }
  }, [history]);

  const handleGenerate = () => {
    const newPassword = generateRandomPassword(length);
    setPassword(newPassword);
    setCopied(false);
    // Add to history
    setHistory((prev: any[]) => {
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
    <div className="w-full max-w-[380px] p-2">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between mb-1">
          <span className="font-semibold text-base">Password Generator</span>
          <label className="flex items-center gap-1 text-xs cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showHistory}
              onChange={e => setShowHistory(e.target.checked)}
              className="accent-primary"
            />
            <span>Show history</span>
          </label>
        </div>
        <div className="flex gap-2 items-center">
          <Input
            ref={inputRef}
            type="text"
            value={password}
            readOnly
            className="font-mono text-base flex-1 bg-muted/50 cursor-default select-all"
            aria-label="Generated password"
          />
          <Button type="button" variant="outline" size="sm" onClick={handleCopy} title="Copy password">
            <Copy className="h-4 w-4" />
            {copied && <span className="ml-1 text-xs">Copied!</span>}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={handleGenerate} title="Generate new password">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs">Length</span>
          <Button type="button" size="sm" variant="ghost" onClick={() => handleLengthChange(length - 1)} disabled={length <= 8} className="px-2">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Input
            type="number"
            min={8}
            max={64}
            value={length}
            onChange={e => handleLengthChange(Number(e.target.value))}
            className="w-16 text-center font-mono text-base px-1 py-1 h-8"
            style={{ minWidth: 0 }}
          />
          <Button type="button" size="sm" variant="ghost" onClick={() => handleLengthChange(length + 1)} disabled={length >= 64} className="px-2">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <input
            id="password-length"
            type="range"
            min={8}
            max={64}
            value={length}
            onChange={e => handleLengthChange(Number(e.target.value))}
            className="flex-1 accent-primary mx-2"
          />
        </div>
        <Button type="button" onClick={handleGenerate} className="w-full mt-1">
          Generate Password
        </Button>
        {showHistory && (
          <div className="mt-2 max-h-40 overflow-y-auto border-t pt-2">
            <div className="flex items-center gap-1 mb-1 text-xs text-muted-foreground font-semibold">
              <Clock className="h-3 w-3" /> Last 20 passwords
            </div>
            {history.length === 0 ? (
              <div className="text-xs text-muted-foreground">No history yet.</div>
            ) : (
              <ul className="space-y-1">
                {history.map((item: any, i: number) => (
                  <li key={i} className="flex items-center gap-2 text-xs font-mono bg-muted/30 rounded px-2 py-1">
                    <span className="truncate flex-1" title={item.value}>{item.value}</span>
                    <span className="text-[10px] text-muted-foreground">{new Date(item.ts).toLocaleTimeString()}</span>
                    <Button type="button" size="sm" variant="ghost" onClick={() => {navigator.clipboard.writeText(item.value)}} title="Copy">
                      <Copy className="h-3 w-3" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

