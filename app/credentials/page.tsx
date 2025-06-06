"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Plus, Key, Copy, Edit, Trash2, Eye, EyeOff, Grid, List } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

export default function CredentialsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());

  const credentials = [
    {
      id: "1",
      name: "GitHub",
      username: "john@example.com",
      password: "secretpass123",
      url: "github.com",
      folder: "Work",
      tags: ["development", "git"],
      favicon: "🐙"
    },
    {
      id: "2",
      name: "Gmail",
      username: "john.doe@gmail.com",
      password: "anothersecret456",
      url: "gmail.com",
      folder: "Personal",
      tags: ["email"],
      favicon: "📧"
    },
    {
      id: "3",
      name: "AWS Console",
      username: "johndoe",
      password: "awspassword789",
      url: "aws.amazon.com",
      folder: "Work",
      tags: ["cloud", "aws"],
      favicon: "☁️"
    },
  ];

  const filteredCredentials = credentials.filter(cred =>
    cred.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cred.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const togglePasswordVisibility = (id: string) => {
    const newVisible = new Set(visiblePasswords);
    if (newVisible.has(id)) {
      newVisible.delete(id);
    } else {
      newVisible.add(id);
    }
    setVisiblePasswords(newVisible);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const CredentialCard = ({ credential }: { credential: typeof credentials[0] }) => (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="text-2xl">{credential.favicon}</div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold truncate">{credential.name}</h3>
            <p className="text-sm text-muted-foreground truncate">{credential.username}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs bg-secondary px-2 py-1 rounded">{credential.folder}</span>
              {credential.tags.map(tag => (
                <span key={tag} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyToClipboard(credential.username)}
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => togglePasswordVisibility(credential.id)}
          >
            {visiblePasswords.has(credential.id) ? 
              <EyeOff className="h-4 w-4" /> : 
              <Eye className="h-4 w-4" />
            }
          </Button>
          <Link href={`/credentials/${credential.id}/edit`}>
            <Button variant="ghost" size="sm">
              <Edit className="h-4 w-4" />
            </Button>
          </Link>
          <Button variant="ghost" size="sm">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {visiblePasswords.has(credential.id) && (
        <div className="mt-3 p-2 bg-muted rounded text-sm font-mono flex items-center justify-between">
          <span>{credential.password}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyToClipboard(credential.password)}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      )}
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Credentials</h1>
          <p className="text-muted-foreground">Manage your stored passwords and accounts</p>
        </div>
        <Link href="/credentials/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Credential
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search credentials..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-1 border rounded-lg p-1">
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("grid")}
          >
            <Grid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {filteredCredentials.length === 0 ? (
        <Card className="p-12 text-center">
          <Key className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No credentials found</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm ? "Try a different search term" : "Start by adding your first credential"}
          </p>
          <Link href="/credentials/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Credential
            </Button>
          </Link>
        </Card>
      ) : (
        <div className={`gap-4 ${
          viewMode === "grid" 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" 
            : "space-y-4"
        }`}>
          {filteredCredentials.map((credential) => (
            <CredentialCard key={credential.id} credential={credential} />
          ))}
        </div>
      )}
    </div>
  );
}
