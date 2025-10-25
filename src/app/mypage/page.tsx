"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthGuard } from "@/hooks/useAuthGuard";

export default function MyPage() {
  const allowed = useAuthGuard();
  const router = useRouter();

  useEffect(() => {
    if (allowed) {
      router.replace("/trips");
    }
  }, [allowed, router]);

  return null;
}
