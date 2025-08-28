"use client";
import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AppwriteService } from "@/lib/appwrite";
import { ImportService } from "@/utils/import/import-service";
import { useAppwrite } from "@/app/appwrite-provider";

function parseBitwardenCSV(csv: string) {
  // TODO: Implement Bitwarden CSV parsing
  return [];
}
function parseZohoCSV(csv: string) {
  // TODO: Implement Zoho Vault CSV parsing
  return [];
}
function parseProtonCSV(csv: string) {
  // TODO: Implement Proton Pass CSV parsing
  return [];
}
function parseJSON(json: string) {
  try {
    const data = JSON.parse(json);
    return Array.isArray(data) ? data : [data];
  } catch {
    return [];
  }
}

export default function ImportSection() {
  const { user } = useAppwrite();
  type ImportVendor = "bitwarden" | "zoho" | "proton" | "json";
  const [importType, setImportType] = useState<ImportVendor>("bitwarden");
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] || null);
    setError(null);
    setSuccess(null);
  };

  const handleImport = async () => {
    if (!user) {
      setError("You must be logged in.");
      return;
    }
    if (!file) {
      setError("Please select a file to import.");
      return;
    }
    setImporting(true);
    setError(null);
    setSuccess(null);
    try {
      const text = await file.text();
      type Imported = Record<string, unknown>;
      let credentials: Imported[] = [];
      if (importType === "bitwarden") credentials = parseBitwardenCSV(text);
      else if (importType === "zoho") credentials = parseZohoCSV(text);
      else if (importType === "proton") credentials = parseProtonCSV(text);
      else if (importType === "json") credentials = parseJSON(text);
      if (!credentials.length) throw new Error("No credentials found in file.");
      credentials = credentials.map((c) => ({ ...c, userId: user.$id }));
      // Use robust ImportService for Bitwarden JSON; CSV parsers are placeholders
      if (importType === "bitwarden" && file.name.toLowerCase().endsWith('.json')) {
        const service = new ImportService();
        const result = await service.importBitwardenData(text, user.$id);
        if (!result.success) {
          setError(result.errors.join("\n") || "Import encountered issues.");
        } else {
          setSuccess(
            `Imported ${result.summary.credentialsCreated} credentials, ${result.summary.totpSecretsCreated} TOTP secrets, created ${result.summary.foldersCreated} folders. Skipped: ${result.summary.skipped}.`
          );
        }
        return;
      }

      await AppwriteService.bulkCreateCredentials(credentials as unknown as Parameters<typeof AppwriteService.bulkCreateCredentials>[0]);
      setSuccess(`Successfully imported ${credentials.length} credentials!`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Import failed.';
      setError(msg);
    }
    setImporting(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="font-medium">Select Vendor</label>
        <div className="flex gap-2 mt-2">
          <Button variant={importType === "bitwarden" ? "default" : "outline"} onClick={() => setImportType("bitwarden")}>Bitwarden</Button>
          <Button variant={importType === "zoho" ? "default" : "outline"} onClick={() => setImportType("zoho")}>Zoho Vault</Button>
          <Button variant={importType === "proton" ? "default" : "outline"} onClick={() => setImportType("proton")}>Proton Pass</Button>
          <Button variant={importType === "json" ? "default" : "outline"} onClick={() => setImportType("json")}>JSON</Button>
        </div>
      </div>
      <div>
        <label className="font-medium">Select File</label>
        <Input type="file" accept={importType === "json" ? ".json" : ".csv"} onChange={handleFileChange} />
      </div>
      <Button onClick={handleImport} disabled={importing || !file} className="w-full">
        {importing ? "Importing..." : "Import"}
      </Button>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      {success && <div className="text-green-600 text-sm">{success}</div>}
      <div className="mt-2 text-xs text-gray-500">
        <p>Supported formats:</p>
        <ul className="list-disc ml-6">
          <li>Bitwarden: Tools &gt; Export Vault &gt; .csv</li>
          <li>Zoho Vault: Export as .csv</li>
          <li>Proton Pass: Export as .csv</li>
          <li>JSON: Custom format (array of credentials)</li>
        </ul>
      </div>
    </div>
  );
}
