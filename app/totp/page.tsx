"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Shield, Plus, Copy, Edit, Trash2, Timer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function TOTPPage() {
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const totpCodes = [
    {
      id: "1",
      issuer: "GitHub",
      account: "john@example.com",
      secret: "JBSWY3DPEHPK3PXP",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      folder: "Work"
    },
    {
      id: "2",
      issuer: "Google",
      account: "john.doe@gmail.com",
      secret: "HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      folder: "Personal"
    },
    {
      id: "3",
      issuer: "AWS",
      account: "johndoe",
      secret: "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      folder: "Work"
    },
  ];

  const generateTOTP = (secret: string, period: number = 30): string => {
    // Simple mock TOTP generation - in real app, use proper TOTP library
    const timeStep = Math.floor(currentTime / 1000 / period);
    const mockCode = ((timeStep % 900000) + 100000).toString();
    return mockCode.substring(0, 6);
  };

  const getTimeRemaining = (period: number = 30): number => {
    return period - (Math.floor(currentTime / 1000) % period);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const TOTPCard = ({ totp }: { totp: typeof totpCodes[0] }) => {
    const code = generateTOTP(totp.secret, totp.period);
    const timeRemaining = getTimeRemaining(totp.period);
    const progress = (timeRemaining / totp.period) * 100;

    return (
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold">{totp.issuer}</h3>
            <p className="text-sm text-muted-foreground">{totp.account}</p>
            <span className="text-xs bg-secondary px-2 py-1 rounded mt-1 inline-block">
              {totp.folder}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm">
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="font-mono text-2xl font-bold tracking-wider">
              {code.substring(0, 3)} {code.substring(3)}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(code)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="text-sm text-muted-foreground">{timeRemaining}s</div>
            <div className="w-8 h-8 relative">
              <svg className="w-8 h-8 transform -rotate-90" viewBox="0 0 32 32">
                <circle
                  cx="16"
                  cy="16"
                  r="14"
                  fill="transparent"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-muted-foreground/20"
                />
                <circle
                  cx="16"
                  cy="16"
                  r="14"
                  fill="transparent"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray={`${progress * 0.88} 88`}
                  className={`transition-all duration-1000 ${
                    timeRemaining <= 5 ? 'text-red-500' : 'text-primary'
                  }`}
                />
              </svg>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">TOTP Codes</h1>
          <p className="text-muted-foreground">Manage your two-factor authentication codes</p>
        </div>
        <Link href="/totp/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add TOTP
          </Button>
        </Link>
      </div>

      {totpCodes.length === 0 ? (
        <Card className="p-12 text-center">
          <Shield className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No TOTP codes found</h3>
          <p className="text-muted-foreground mb-4">
            Start by adding your first two-factor authentication code
          </p>
          <Link href="/totp/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add TOTP
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {totpCodes.map((totp) => (
            <TOTPCard key={totp.id} totp={totp} />
          ))}
        </div>
      )}
    </div>
  );
}
