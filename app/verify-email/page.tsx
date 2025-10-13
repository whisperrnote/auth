"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { VerifyEmailModal } from "@/components/overlays/VerifyEmailModal";

export default function VerifyEmailPage() {
  const params = useSearchParams();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Always show the modal when this page is accessed
    setShowModal(true);
  }, []);

  return <VerifyEmailModal isOpen={showModal} onClose={() => setShowModal(false)} />;
}
