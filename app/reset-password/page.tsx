"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ResetPasswordModal } from "@/components/overlays/ResetPasswordModal";

export default function ResetPasswordPage() {
  const params = useSearchParams();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Always show the modal when this page is accessed
    setShowModal(true);
  }, []);

  return <ResetPasswordModal isOpen={showModal} onClose={() => setShowModal(false)} />;
}
