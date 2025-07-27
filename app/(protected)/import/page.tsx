"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AppwriteService } from "@/lib/appwrite";
import { useAppwrite } from "@/app/appwrite-provider";

// Vendor importers (to be implemented below)
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

export default function ImportPage() {
  const { user } = useAppwrite();
  const [importType, setImportType] = useState<string>("bitwarden");
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
      let credentials: any[] = [];
      if (importType === "bitwarden") credentials = parseBitwardenCSV(text);
      else if (importType === "zoho") credentials = parseZohoCSV(text);
      else if (importType === "proton") credentials = parseProtonCSV(text);
      else if (importType === "json") credentials = parseJSON(text);
      if (!credentials.length) throw new Error("No credentials found in file.");
      // Attach userId to each credential
      credentials = credentials.map((c) => ({ ...c, userId: user.$id }));
      await AppwriteService.bulkCreateCredentials(credentials);
      setSuccess(`Successfully imported ${credentials.length} credentials!`);
    } catch (e: any) {
      setError(e.message || "Import failed.");
    }
    setImporting(false);
  };

  return (
    <div className="max-w-2xl mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">Import Credentials</h1>
      <Card className="p-6 space-y-4">
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
           <label className="font-medium">Select File Format</label>
           {importType === "bitwarden" ? (
             <div className="flex gap-2 mt-2">
               <Button variant="default" disabled>JSON (.json)</Button>
               <Button variant="outline" disabled>CSV (.csv)</Button>
               <Button variant="outline" disabled>Encrypted JSON (.json)</Button>
               <Button variant="outline" disabled>ZIP (.zip, with attachments)</Button>
             </div>
           ) : null}
           <label className="font-medium mt-4 block">Select File</label>
           <Input
             type="file"
             accept={importType === "bitwarden" ? ".json" : importType === "json" ? ".json" : ".csv"}
             onChange={handleFileChange}
             disabled={importType === "bitwarden" ? false : false}
           />
         </div>        <Button onClick={handleImport} disabled={importing || !file} className="w-full">
          {importing ? "Importing..." : "Import"}
        </Button>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        {success && <div className="text-green-600 text-sm">{success}</div>}
      </Card>
      <div className="mt-8 text-sm text-gray-500">
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
