"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAppwrite } from "../appwrite-provider";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAppwrite();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router, pathname]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return <>{children}</>;
}
