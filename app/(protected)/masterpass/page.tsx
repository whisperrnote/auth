"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppwrite } from "@/app/appwrite-provider";
import { MasterPassModal } from "@/components/overlays/MasterPassModal";

export default function MasterPassPage() {
  const [showModal, setShowModal] = useState(false);
  const { user } = useAppwrite();
  const router = useRouter();

  // Redirect to home if not logged in
  useEffect(() => {
    if (user === null) {
      router.replace("/");
    } else if (user) {
      setShowModal(true);
    }
  }, [user, router]);

  return <MasterPassModal isOpen={showModal} onClose={() => router.replace("/dashboard")} />;
}
