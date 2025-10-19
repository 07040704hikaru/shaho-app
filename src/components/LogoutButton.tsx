"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export function LogoutButton() {
  const { logout } = useAuth();
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        logout();
        router.push("/login");
      }}
    >
      ログアウト
    </button>
  );
}
