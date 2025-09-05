"use client";

import { getMfaAuthenticationStatus, hasMasterpass } from "@/lib/appwrite";
import { useRouter } from "next/navigation";
import { useAppwrite } from "@/app/appwrite-provider";

/**
 * Centralized post-auth finalization.
 * - Ensures Appwrite session is settled (post-MFA/OTP/password/passkey)
 * - Refreshes Auth context
 * - router.refresh() to refetch RSC and cookies
 * - Navigates to the correct next route (masterpass or dashboard) if requested
 */
export function useFinalizeAuth() {
  const router = useRouter();
  const { refresh, user, isVaultUnlocked, isAuthReady } = useAppwrite();

  const finalize = async (options?: {
    redirect?: boolean;
    fallback?: string;
  }) => {
    // 1) Touch account to ensure cookies/session are applied
    try {
      await getMfaAuthenticationStatus();
    } catch {}

    // 2) Refresh app context
    await refresh();

    // 3) Refresh RSC tree so guards/topbar see new auth
    router.refresh();

    if (options?.redirect) {
      // Decide next route
      const u =
        user ||
        (await (async () => {
          await refresh();
          return null;
        })());
      // If no user after refresh, go to fallback/login
      if (!u) {
        router.replace(options.fallback || "/login");
        return;
      }
      // Check masterpass and vault
      const hasMp = await hasMasterpass(u.$id);
      if (!hasMp || !isVaultUnlocked()) {
        router.replace("/masterpass");
      } else {
        router.replace("/dashboard");
      }
    }
  };

  return { finalizeAuth: finalize };
}
