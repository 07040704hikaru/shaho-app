"use client";

import { useAuthGuard } from "@/hooks/useAuthGuard";

export default function MyPage() {
  const allowed = useAuthGuard();
  if (!allowed) {
    return null;
  }

  return <div style={{ padding: 24 }}>マイページ（ログイン済のみ）</div>;
}
