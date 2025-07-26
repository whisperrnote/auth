"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAppwrite } from "@/app/appwrite-provider";

/**
 * VaultGuard: Wrap protected pages/components with this to enforce
 * that the vault (crypto module) is unlocked. If not, redirect to /masterpass.
 *
 * Usage:
 *   <VaultGuard>
 *     ...protected content...
 *   </VaultGuard>
 */
export default function VaultGuard({ children }: { children: React.ReactNode }) {
  const { isVaultUnlocked, needsMasterPassword } = useAppwrite();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // If vault is locked or needs master password, redirect to /masterpass
    if (needsMasterPassword || !isVaultUnlocked()) {
      // Store current path for return after unlock
      if (typeof window !== "undefined") {
        sessionStorage.setItem("masterpass_return_to", pathname);
      }
      router.replace("/masterpass");
    }
  }, [needsMasterPassword, isVaultUnlocked, pathname, router]);

  // Only render children if vault is unlocked
  if (needsMasterPassword || !isVaultUnlocked()) {
    return null;
  }

  return <>{children}</>;
}
