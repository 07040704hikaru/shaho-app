"use client";

import { SpotManager } from "@/components/spots/SpotManager";
import { useAuthGuard } from "@/hooks/useAuthGuard";

export default function MyPage() {
  const allowed = useAuthGuard();
  if (!allowed) {
    return null;
  }

  return (
    <main className="page page--with-sidebar">
      <header className="page__header">
        <h1 className="page__title">マイページ</h1>
        <p className="page__subtitle">
          スポットの追加・編集・削除はここから行えます。
        </p>
      </header>

      <section className="page__content">
        <SpotManager />
      </section>
    </main>
  );
}
