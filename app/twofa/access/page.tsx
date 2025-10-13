"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMfaAuthenticationStatus } from "@/lib/appwrite";
import { TwoFAModal } from "@/components/overlays/TwoFAModal";

export default function TwofaAccessPage() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const checkMfaStatus = async () => {
      try {
        const mfaStatus = await getMfaAuthenticationStatus();
        if (mfaStatus.isFullyAuthenticated) {
          router.replace("/masterpass");
          return;
        }
        if (mfaStatus.needsMfa) {
          setShowModal(true);
          return;
        }
        router.replace("/");
      } catch (error: unknown) {
        const err = error as { message?: string; type?: string };
        const msg = err?.message || "";
        const type = err?.type || "";
        if (
          type === "user_more_factors_required" ||
          msg.includes("More factors are required")
        ) {
          setShowModal(true);
          return;
        }
        router.replace("/");
      }
    };
    checkMfaStatus();
  }, [router]);

  return <TwoFAModal isOpen={showModal} onClose={() => router.replace("/masterpass")} />;
}
