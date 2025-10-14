"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useSearchParams();
  
  useEffect(() => {
    // Preserve userId and secret query params when redirecting
    const userId = params.get("userId");
    const secret = params.get("secret");
    const queryParams = userId && secret ? `?userId=${userId}&secret=${secret}` : "";
    router.replace(`/${queryParams}`);
  }, [router, params]);

  return null;
}
