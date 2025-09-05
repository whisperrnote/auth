"use client";

import { useState, useRef, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAppwrite } from "@/app/appwrite-provider";
import {
  ImportService,
  type ImportProgress,
  type ImportResult,
} from "@/utils/import/import-service";
import { validateBitwardenExport } from "@/utils/import/bitwarden-mapper";

// Progress component
function ImportProgressIndicator({
  progress,
}: {
  progress: ImportProgress | null;
}) {
  if (!progress) return null;

  const progressPercent = Math.round(
    (progress.currentStep / progress.totalSteps) * 100,
  );
  const itemsPercent =
    progress.itemsTotal > 0
      ? Math.round((progress.itemsProcessed / progress.itemsTotal) * 100)
      : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{progress.message}</span>
        <span className="text-sm text-gray-500">{progressPercent}%</span>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {progress.itemsTotal > 0 && (
        <div className="text-xs text-gray-500">
          Items: {progress.itemsProcessed} / {progress.itemsTotal} (
          {itemsPercent}%)
        </div>
      )}

      {progress.errors.length > 0 && (
        <div className="text-xs text-red-600">
          {progress.errors.length} error(s) occurred
        </div>
      )}
    </div>
  );
}

// Results component
function ImportResults({ result }: { result: ImportResult | null }) {
  if (!result) return null;

  return (
    <div className="space-y-4">
      <div
        className={`p-4 rounded-lg ${result.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}
      >
        <h3
          className={`font-medium ${result.success ? "text-green-800" : "text-red-800"}`}
        >
          {result.success ? "Import Completed" : "Import Failed"}
        </h3>

        <div className="mt-2 space-y-1 text-sm">
          <div>Folders created: {result.summary.foldersCreated}</div>
          <div>Credentials imported: {result.summary.credentialsCreated}</div>
          <div>TOTP secrets imported: {result.summary.totpSecretsCreated}</div>
          {result.summary.skipped > 0 && (
            <div>Items skipped: {result.summary.skipped}</div>
          )}
          {result.summary.errors > 0 && (
            <div className="text-red-600">Errors: {result.summary.errors}</div>
          )}
        </div>
      </div>

      {result.errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="font-medium text-red-800 mb-2">Errors:</h4>
          <div className="space-y-1 text-sm text-red-700 max-h-32 overflow-y-auto">
            {result.errors.map((error, index) => (
              <div key={index}>• {error}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ImportPage() {
  const { user } = useAppwrite();
  const [importType, setImportType] = useState<string>("bitwarden");
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const importServiceRef = useRef<ImportService | null>(null);

  const progressCallback = useCallback((newProgress: ImportProgress) => {
    setProgress(newProgress);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] || null);
    setProgress(null);
    setResult(null);
  };

  const validateFile = async (file: File): Promise<string> => {
    try {
      const text = await file.text();

      if (importType === "bitwarden") {
        const data = JSON.parse(text);
        if (!validateBitwardenExport(data)) {
          throw new Error(
            "Invalid Bitwarden export format. Please export your vault as JSON from Bitwarden.",
          );
        }
      }

      return text;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(
          "Invalid JSON file. Please ensure you've exported the correct format.",
        );
      }
      throw error;
    }
  };

  const handleImport = async () => {
    if (!user) {
      setResult({
        success: false,
        summary: {
          foldersCreated: 0,
          credentialsCreated: 0,
          totpSecretsCreated: 0,
          errors: 1,
          skipped: 0,
        },
        errors: ["You must be logged in to import data."],
        folderMapping: new Map(),
      });
      return;
    }

    if (!file) {
      setResult({
        success: false,
        summary: {
          foldersCreated: 0,
          credentialsCreated: 0,
          totpSecretsCreated: 0,
          errors: 1,
          skipped: 0,
        },
        errors: ["Please select a file to import."],
        folderMapping: new Map(),
      });
      return;
    }

    setImporting(true);
    setProgress(null);
    setResult(null);

    try {
      const fileContent = await validateFile(file);

      if (importType === "bitwarden") {
        importServiceRef.current = new ImportService(progressCallback);
        const importResult = await importServiceRef.current.importBitwardenData(
          fileContent,
          user.$id,
        );
        setResult(importResult);
      } else {
        throw new Error(`Import type "${importType}" is not yet implemented.`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Import failed with unknown error.";
      setResult({
        success: false,
        summary: {
          foldersCreated: 0,
          credentialsCreated: 0,
          totpSecretsCreated: 0,
          errors: 1,
          skipped: 0,
        },
        errors: [errorMessage],
        folderMapping: new Map(),
      });
    } finally {
      setImporting(false);
    }
  };

  const isFileValid =
    file &&
    ((importType === "bitwarden" && file.name.endsWith(".json")) ||
      (importType === "json" && file.name.endsWith(".json")) ||
      (!["bitwarden", "json"].includes(importType) &&
        file.name.endsWith(".csv")));

  return (
    <div className="max-w-4xl mx-auto py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Import Data</h1>
        <p className="text-gray-600">
          Import your passwords and data from other password managers
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <Card className="p-6">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-3">
                  Select Password Manager
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={importType === "bitwarden" ? "default" : "outline"}
                    onClick={() => setImportType("bitwarden")}
                    className="justify-start"
                  >
                    Bitwarden
                  </Button>
                  <Button
                    variant={importType === "zoho" ? "default" : "outline"}
                    onClick={() => setImportType("zoho")}
                    className="justify-start"
                    disabled
                  >
                    Zoho Vault
                  </Button>
                  <Button
                    variant={importType === "proton" ? "default" : "outline"}
                    onClick={() => setImportType("proton")}
                    className="justify-start"
                    disabled
                  >
                    Proton Pass
                  </Button>
                  <Button
                    variant={importType === "json" ? "default" : "outline"}
                    onClick={() => setImportType("json")}
                    className="justify-start"
                    disabled
                  >
                    Custom JSON
                  </Button>
                </div>
              </div>

              {importType === "bitwarden" && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-medium text-blue-800 mb-2">
                    How to export from Bitwarden:
                  </h3>
                  <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                    <li>Log into your Bitwarden web vault</li>
                    <li>
                      Go to <strong>Tools</strong> →{" "}
                      <strong>Export Vault</strong>
                    </li>
                    <li>
                      Select <strong>JSON (.json)</strong> format
                    </li>
                    <li>
                      Enter your master password and click{" "}
                      <strong>Export Vault</strong>
                    </li>
                    <li>Save the file and upload it here</li>
                  </ol>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-3">
                  Select File
                  {importType === "bitwarden" && (
                    <span className="text-gray-500">(JSON format)</span>
                  )}
                </label>
                <Input
                  type="file"
                  accept={
                    importType === "bitwarden"
                      ? ".json"
                      : importType === "json"
                        ? ".json"
                        : ".csv"
                  }
                  onChange={handleFileChange}
                  className="mb-2"
                />
                {file && (
                  <div className="text-sm text-gray-600">
                    Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </div>
                )}
              </div>

              <Button
                onClick={handleImport}
                disabled={importing || !isFileValid}
                className="w-full"
              >
                {importing ? "Importing..." : "Start Import"}
              </Button>
            </div>
          </Card>

          {!importing && !result && (
            <Card className="p-6">
              <h3 className="font-medium mb-3">⚠️ Important Notes</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p>
                  • <strong>Do not navigate away</strong> from this page during
                  import
                </p>
                <p>• Large imports may take several minutes to complete</p>
                <p>• Your data will be encrypted with your master password</p>
                <p>• TOTP codes will be automatically separated and imported</p>
                <p>• Folders and organization will be preserved</p>
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {importing && progress && (
            <Card className="p-6">
              <h3 className="font-medium mb-4">Import Progress</h3>
              <ImportProgressIndicator progress={progress} />
            </Card>
          )}

          {result && (
            <Card className="p-6">
              <h3 className="font-medium mb-4">Import Results</h3>
              <ImportResults result={result} />
            </Card>
          )}

          <Card className="p-6">
            <h3 className="font-medium mb-3">What gets imported?</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <div className="font-medium">Login Credentials</div>
                  <div className="text-gray-600">
                    Usernames, passwords, URLs, and notes
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <div className="font-medium">TOTP Secrets</div>
                  <div className="text-gray-600">
                    Two-factor authentication codes (automatically separated)
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <div className="font-medium">Folders & Organization</div>
                  <div className="text-gray-600">
                    Folder structure and item organization
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <div className="font-medium">Custom Fields</div>
                  <div className="text-gray-600">
                    Additional fields and metadata
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
