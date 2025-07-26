"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Copy } from "lucide-react";
import { generateRandomPassword } from "@/utils/password";

export default function PasswordGenerator() {
  const [length, setLength] = useState(16);
  const [password, setPassword] = useState(() => generateRandomPassword(16));
  const [copied, setCopied] = useState(false);

  const handleGenerate = () => {
    setPassword(generateRandomPassword(length));
    setCopied(false);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <Card className="w-full max-w-md mx-auto mb-10 shadow-lg">
      <CardHeader>
        <CardTitle className="text-center text-2xl">Password Generator</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div>
            <label htmlFor="password-length" className="block text-sm font-medium mb-1">
              Password Length: <span className="font-mono">{length}</span>
            </label>
            <input
              id="password-length"
              type="range"
              min={8}
              max={64}
              value={length}
              onChange={e => setLength(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>
          <div className="flex gap-2 items-center">
            <Input
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
          </div>
          <Button type="button" onClick={handleGenerate} className="w-full mt-2">
            Generate Password
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
