"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Key, Shield, Clock, AlertTriangle, Files } from "lucide-react";
import { useAppwrite } from "@/app/appwrite-provider";
import { appwriteDatabases, APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_TOTPSECRETS_ID, Query, AppwriteService } from "@/lib/appwrite";
import { masterPassCrypto } from "@/app/(protected)/masterpass/logic";

export default function OverviewPage() {
  const { user } = useAppwrite();
  const [stats, setStats] = useState({ totalCreds: 0, totpCount: 0 });
  const [recent, setRecent] = useState<Array<{ $id: string; name: string; username?: string }>>([]);
   const [loading, setLoading] = useState(true);
  const [dupGroups, setDupGroups] = useState<Array<{ key: string; count: number; fields: string[]; ids: string[] }>>([]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!user) return;
      // Ensure vault is unlocked; do not decrypt twice – listDocuments is already wrapped to decrypt via masterPassCrypto
      try {
        // Credentials
        const credsResp = await AppwriteService.listCredentials(
          user.$id,
          1,
          0,
          [Query.orderDesc("$updatedAt")]
        ) as { total: number; documents: Array<Record<string, unknown>> };

        // TOTP
        let totpCount = 0;
        try {
          const totpResp = await appwriteDatabases.listDocuments(
            APPWRITE_DATABASE_ID,
            APPWRITE_COLLECTION_TOTPSECRETS_ID,
            [Query.equal("userId", user.$id), Query.limit(1)]
          ) as { documents: Array<Record<string, unknown>>; total?: number };
          totpCount = (totpResp as { total?: number; documents: Array<Record<string, unknown>> }).total ?? totpResp.documents.length;
        } catch {
          // TOTP collection may not exist in some envs; ignore
        }

         const totalCreds = (credsResp as { total?: number; documents?: Array<Record<string, unknown>> }).total ?? (credsResp.documents?.length ?? 0);

         // Duplicate detection using minimal data and service decryption only
         // Strategy: fetch a small window of recent decrypted items and compute signature over stable fields
         let dupGroupsLocal: Array<{ key: string; count: number; fields: string[]; ids: string[] }> = [];
         try {
           const windowSize = Math.min(50, totalCreds);
            const recentWindow = await AppwriteService.listCredentials(
              user.$id,
              windowSize,
              0,
              [Query.orderDesc('$updatedAt')]
            ) as { documents?: Array<Record<string, unknown>> };
            const items = recentWindow.documents || [];
           // Determine comparable fields: prefer encrypted content fields + url; exclude non-content/meta fields
           const fieldCandidates = ['username','password','url','notes','customFields'];
            const fieldsPresent = fieldCandidates.filter((f) => items.some((it) => {
              const val = (it as Record<string, unknown>)[f];
              return val != null && String(val).trim() !== '';
            }));
           const groups = new Map<string, { ids: string[] }>();

           const normalize = (v: unknown) => {
             if (v == null) return '';
             if (typeof v === 'string') return v.trim().toLowerCase();
             try { return JSON.stringify(v); } catch { return String(v); }
           };

           for (const it of items) {
             const sigObj: Record<string, unknown> = {};
             for (const f of fieldsPresent) sigObj[f] = normalize((it as any)[f]);
             // Do not include name in signature, per requirement
             const signature = JSON.stringify(sigObj);
              const entry = groups.get(signature) || { ids: [] };
              entry.ids.push(String((it as Record<string, unknown>)["$id"])) ;
              groups.set(signature, entry);
           }

           dupGroupsLocal = Array.from(groups.entries())
             .filter(([, v]) => v.ids.length > 1)
             .map(([k, v]) => ({ key: k, count: v.ids.length, fields: fieldsPresent, ids: v.ids }));
         } catch {}


        // Recent items (already decrypted by secure wrapper; do not decrypt again)
        let recentItems: Array<{ $id: string; name: string; username?: string }> = [];
        try {
          // Use service that returns decrypted recent credentials
           const recentDocs = await AppwriteService.listRecentCredentials(user.$id, 5) as Array<Record<string, unknown>>;
          recentItems = recentDocs.map((d) => ({ $id: String(d.$id as unknown as string), name: (d.name as string) ?? (d.title as string) ?? "Untitled", username: d.username as string | undefined }));
        } catch {
          // Fallback to what's available from credsResp (may be undecrypted if vault locked)
          recentItems = (credsResp.documents || []).slice(0, 5).map((d) => ({ $id: String((d as Record<string, unknown>)["$id"]), name: ((d as Record<string, unknown>)["name"] as string) ?? ((d as Record<string, unknown>)["title"] as string) ?? "Untitled", username: (d as Record<string, unknown>)["username"] as string | undefined }));
        }

        if (!cancelled) {
           setStats({ totalCreds, totpCount });
           setRecent(locked ? [] : recentItems);
           setDupGroups(locked ? [] : dupGroupsLocal);
           setLoading(false);
        }
      } catch (e) {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [user, /* keep locked out of deps to avoid unnecessary refetch on timer */]);

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
 
         <Card>
           <CardContent className="p-4">
             <div className="flex items-center justify-between mb-2">
               <h3 className="text-sm font-semibold">Duplicate Items</h3>
               <div className="text-xs text-muted-foreground flex items-center gap-2">
                 <Files className="h-4 w-4" />
                 <span>
                   {loading ? "--" : dupGroups.length} duplicate group{dupGroups.length === 1 ? "" : "s"}
                 </span>
               </div>
             </div>
 
             {loading ? (
               <div className="text-sm text-muted-foreground">Scanning…</div>
             ) : dupGroups.length === 0 ? (
               <div className="text-sm text-muted-foreground">No duplicates detected in recent items window.</div>
             ) : (
               <div className="space-y-3">
                 {dupGroups.map((g, idx) => (
                   <div key={g.key} className="border rounded-md p-3">
                     <div className="flex items-center justify-between">
                       <div className="text-sm font-medium">Group #{idx + 1} • {g.count} matches</div>
                       <Link href={`/dashboard?focus=${g.ids[0]}`}><Button size="sm" variant="outline">Review</Button></Link>
                     </div>
                     <div className="mt-2 text-xs text-muted-foreground">
                       Matching fields:
                       <code className="ml-1 px-1 py-0.5 bg-muted rounded">{g.fields.join(", ") || "(none)"}</code>
                     </div>
                     <div className="mt-2 text-xs">
                       Suggestions: consider keeping the most recently updated item and deleting older duplicates.
                     </div>
                     <div className="mt-2 flex flex-wrap gap-2">
                       {g.ids.map((id) => (
                         <Link key={id} href={`/dashboard?focus=${id}`}>
                           <span className="text-xs px-2 py-1 bg-accent/50 rounded hover:bg-accent cursor-pointer">{id.slice(0, 8)}…</span>
                         </Link>
                       ))}
                     </div>
                   </div>
                 ))}
               </div>
             )}
           </CardContent>
         </Card>
       </div>
     </div>
   );
}
