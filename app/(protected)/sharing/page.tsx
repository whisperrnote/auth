"use client";

import { useState } from "react";
import { UserPlus, Construction } from "lucide-react";
import VaultGuard from "@/components/layout/VaultGuard";

export default function SharingPage() {
  return (
    <VaultGuard>
      <div className="w-full min-h-screen bg-background flex flex-col items-center justify-center text-center p-4">
        <Construction className="h-16 w-16 text-primary mb-4" />
        <h1 className="text-3xl font-bold text-primary drop-shadow-md mb-2">
          Sharing Center is Under Construction
        </h1>
        <p className="text-muted-foreground max-w-md">
          This feature is not yet available. We are working hard to bring you a
          secure and easy way to share your credentials with others. Stay tuned!
        </p>
      </div>
    </VaultGuard>
  );
}
