"use client";

import { useState } from "react";
import { FolderOpen, Plus, Edit, Trash2, FolderPlus, Key, Shield } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

export default function FoldersPage() {
  const [newFolderName, setNewFolderName] = useState("");
  const [editingFolder, setEditingFolder] = useState<string | null>(null);

  const folders = [
    { id: "1", name: "Work", credentialCount: 8, totpCount: 2, color: "bg-blue-500" },
    { id: "2", name: "Personal", credentialCount: 12, totpCount: 3, color: "bg-green-500" },
    { id: "3", name: "Banking", credentialCount: 4, totpCount: 1, color: "bg-red-500" },
    { id: "4", name: "Shopping", credentialCount: 6, totpCount: 0, color: "bg-purple-500" },
  ];

  const handleAddFolder = () => {
    if (newFolderName.trim()) {
      console.log("Adding folder:", newFolderName);
      setNewFolderName("");
    }
  };

  const handleEditFolder = (id: string, newName: string) => {
    console.log("Editing folder:", id, newName);
    setEditingFolder(null);
  };

  const handleDeleteFolder = (id: string) => {
    if (confirm("Are you sure you want to delete this folder? Items will be moved to 'Uncategorized'.")) {
      console.log("Deleting folder:", id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Folders</h1>
          <p className="text-muted-foreground">Organize your credentials and TOTP codes</p>
        </div>
      </div>

      {/* Add New Folder */}
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <FolderPlus className="h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Enter folder name..."
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleAddFolder()}
            className="flex-1"
          />
          <Button onClick={handleAddFolder} disabled={!newFolderName.trim()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Folder
          </Button>
        </div>
      </Card>

      {/* Folders Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {folders.map((folder) => (
          <Card key={folder.id} className="p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${folder.color}`} />
                {editingFolder === folder.id ? (
                  <Input
                    defaultValue={folder.name}
                    onBlur={(e) => handleEditFolder(folder.id, e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        handleEditFolder(folder.id, e.currentTarget.value);
                      }
                    }}
                    className="text-lg font-semibold"
                    autoFocus
                  />
                ) : (
                  <h3 className="text-lg font-semibold">{folder.name}</h3>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingFolder(folder.id)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteFolder(folder.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-muted-foreground" />
                  <span>Credentials</span>
                </div>
                <span className="font-medium">{folder.credentialCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span>TOTP Codes</span>
                </div>
                <span className="font-medium">{folder.totpCount}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t">
              <Button variant="outline" size="sm" className="w-full">
                <FolderOpen className="h-4 w-4 mr-2" />
                View Contents
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {folders.length === 0 && (
        <Card className="p-12 text-center">
          <FolderOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No folders created</h3>
          <p className="text-muted-foreground mb-4">
            Create your first folder to organize your credentials
          </p>
          <Button onClick={() => document.querySelector<HTMLInputElement>('input')?.focus()}>
            <Plus className="h-4 w-4 mr-2" />
            Create Folder
          </Button>
        </Card>
      )}
    </div>
  );
}
