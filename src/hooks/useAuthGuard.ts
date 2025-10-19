"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AUTH_TOKEN_STORAGE_KEY } from "@/lib/auth/constants";

export function useAuthGuard() {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    if (!token) {
      router.replace("/login");
      return;
    }
    setAllowed(true);
  }, [router]);

  return allowed;
}
