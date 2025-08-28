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
  const { isVaultUnlocked, needsMasterPassword, isAuthReady } = useAppwrite();
  const router = useRouter();
  const pathname = usePathname();
  const verbose = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_LOGGING_VERBOSE === 'true' : false;

  useEffect(() => {
    if (!isAuthReady) return; // wait for hydration/auth

    const locked = needsMasterPassword || !isVaultUnlocked();
    if (verbose) console.log('[vault-guard] ready, locked?', locked, 'path', pathname);

    if (locked) {
      if (typeof window !== "undefined") {
        try { sessionStorage.setItem("masterpass_return_to", pathname); } catch {}
      }
      router.replace("/masterpass");
    }
  }, [isAuthReady, needsMasterPassword, isVaultUnlocked, pathname, router, verbose]);

  if (!isAuthReady) {
    return null; // or a skeleton
  }

  if (needsMasterPassword || !isVaultUnlocked()) {
    return null;
  }

  return <>{children}</>;
}
