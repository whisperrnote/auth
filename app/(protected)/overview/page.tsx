"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Key, Shield, Clock, AlertTriangle } from "lucide-react";
import { useAppwrite } from "@/app/appwrite-provider";
import { appwriteDatabases, APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_CREDENTIALS_ID, APPWRITE_COLLECTION_TOTPSECRETS_ID, Query } from "@/lib/appwrite";
import { masterPassCrypto } from "@/app/(protected)/masterpass/logic";

export default function OverviewPage() {
  const { user } = useAppwrite();
  const [stats, setStats] = useState({ totalCreds: 0, totpCount: 0 });
  const [recent, setRecent] = useState<Array<{ $id: string; name: string; username?: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!user) return;
      // Ensure vault is unlocked; do not decrypt twice – listDocuments is already wrapped to decrypt via masterPassCrypto
      try {
        // Credentials
        const credsResp = await appwriteDatabases.listDocuments(
          APPWRITE_DATABASE_ID,
          APPWRITE_COLLECTION_CREDENTIALS_ID,
          [Query.equal("userId", user.$id), Query.orderDesc("$updatedAt"), Query.limit(50)]
        ) as { documents: any[] };

        // TOTP
        let totpCount = 0;
        try {
          const totpResp = await appwriteDatabases.listDocuments(
            APPWRITE_DATABASE_ID,
            APPWRITE_COLLECTION_TOTPSECRETS_ID,
            [Query.equal("userId", user.$id)]
          ) as { documents: any[] };
          totpCount = totpResp.documents.length;
        } catch {
          // TOTP collection may not exist in some envs; ignore
        }

        const totalCreds = credsResp.documents.length;

        // Recent items (already decrypted by secure wrapper; do not decrypt again)
        const recentItems = credsResp.documents
          .slice(0, 5)
          .map((d) => ({ $id: d.$id, name: d.name ?? d.title ?? "Untitled", username: d.username }));

        if (!cancelled) {
          setStats({ totalCreds, totpCount });
          setRecent(recentItems);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [user]);

  const locked = useMemo(() => !masterPassCrypto.isVaultUnlocked(), []);

  if (!user) return null;

  return (
    <div className="w-full min-h-screen bg-background flex items-start justify-center">
      <div className="w-full max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Overview</h1>
            <p className="text-muted-foreground text-sm">A quick snapshot of your vault.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/credentials/new"><Button size="sm">Add Credential</Button></Link>
            <Link href="/import"><Button size="sm" variant="outline">Import</Button></Link>
          </div>
        </div>

        {locked && (
          <Card>
            <CardContent className="p-4 flex items-center gap-3 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              <p className="text-sm">Your vault appears locked. Some data may not be visible. Unlock to view full overview.</p>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total Credentials</p>
                <p className="text-xl font-bold">{loading ? "--" : stats.totalCreds}</p>
              </div>
              <Key className="h-6 w-6 text-blue-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">TOTP Codes</p>
                <p className="text-xl font-bold">{loading ? "--" : stats.totpCount}</p>
              </div>
              <Shield className="h-6 w-6 text-green-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Recent Activity</p>
                <p className="text-xl font-bold">{loading ? "--" : Math.min(stats.totalCreds, 5)}</p>
              </div>
              <Clock className="h-6 w-6 text-orange-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Security Alerts</p>
                <p className="text-xl font-bold">0</p>
              </div>
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
          </Card>
        </div>

        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3">Recent Items</h3>
            <div className="space-y-2">
              {loading ? (
                <div className="text-sm text-muted-foreground">Loading…</div>
              ) : recent.length === 0 ? (
                <div className="text-sm text-muted-foreground">No items yet.</div>
              ) : (
                recent.map((item) => (
                  <Link key={item.$id} href={`/dashboard?focus=${item.$id}`} className="block">
                    <div className="flex items-center justify-between p-2 rounded-md hover:bg-accent/50 cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">{item.name?.[0] ?? "?"}</div>
                        <div>
                          <p className="text-sm font-medium">{item.name}</p>
                          {item.username && <p className="text-xs text-muted-foreground">{item.username}</p>}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="h-7">Open</Button>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
