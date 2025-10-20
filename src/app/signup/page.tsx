"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function SignupPage() {
  const router = useRouter();
  const { login, token } = useAuth();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      router.replace("/trips");
    }
  }, [token, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, displayName, password }),
      });

      const body = (await res.json().catch(() => null)) as { token?: string; message?: string } | null;
      if (!res.ok || !body?.token) {
        setError(body?.message ?? "登録に失敗しました。入力内容をご確認ください。");
        return;
      }

      login(body.token);
      router.push("/trips");
    } catch {
      setError("サーバーに接続できませんでした。しばらくしてから再度お試しください。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative min-h-screen bg-gradient-to-br from-surface-subtle via-white to-surface-subtle">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(86,111,255,0.14),transparent_55%),radial-gradient(circle_at_80%_20%,rgba(86,111,255,0.08),transparent_50%)]" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col gap-12 px-6 py-16 lg:flex-row lg:items-center lg:justify-between lg:px-12">
        <section className="mx-auto max-w-xl space-y-6 text-center lg:text-left">
          <span className="inline-flex items-center rounded-full border border-brand/20 bg-white px-4 py-1 text-sm font-medium text-brand shadow-sm">
            Start your journey
          </span>
          <h1 className="text-4xl font-bold tracking-tight text-text-primary sm:text-5xl">
            新しい冒険のためのアカウントを作成
          </h1>
          <p className="text-lg text-text-secondary">
            仲間と旅のプランを共有したり、スポットの思い出を追加したり。
            今すぐ無料でアカウントを作成して旅を始めましょう。
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <FeatureCard
              title="共同編集"
              description="スポット情報やメッセージを複数メンバーで編集できます。"
              icon="🤝"
            />
            <FeatureCard
              title="カスタム思い出"
              description="写真・メッセージをスポットごとに保存し、旅を豊かに。"
              icon="📝"
            />
          </div>
        </section>

        <section className="mx-auto w-full max-w-md rounded-3xl bg-white/90 p-8 shadow-soft backdrop-blur">
          <div className="mb-6 space-y-2 text-center">
            <h2 className="text-2xl font-semibold text-text-primary">アカウント作成</h2>
            <p className="text-sm leading-relaxed text-text-muted">
              メールアドレスと 8 文字以上のパスワードをご用意ください。表示名はいつでも変更できます。
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <FormField
              id="signup-email"
              label="メールアドレス"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />

            <FormField
              id="signup-displayName"
              label="表示名（任意）"
              type="text"
              value={displayName}
              onChange={setDisplayName}
              placeholder="旅のナビゲーター"
            />

            <FormField
              id="signup-password"
              label="パスワード"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="8文字以上で入力"
              autoComplete="new-password"
              required
              minLength={8}
            />

            {error ? (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-3 text-base font-semibold text-white shadow-soft transition hover:bg-brand-dark focus:outline-none focus:ring-4 focus:ring-brand/40 disabled:cursor-not-allowed disabled:bg-brand/60"
            >
              {isSubmitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  登録中...
                </>
              ) : (
                "アカウントを作成"
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-text-muted">
            既にアカウントをお持ちの方は{" "}
            <Link className="font-semibold text-brand hover:underline" href="/login">
              ログイン
            </Link>
            へ
          </p>
        </section>
      </div>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-white/80 px-5 py-4 shadow-soft backdrop-blur">
      <span className="mt-1 inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand/10 text-lg">
        {icon}
      </span>
      <div className="space-y-1 text-left text-sm text-text-secondary">
        <p className="font-semibold text-text-primary">{title}</p>
        <p>{description}</p>
      </div>
    </div>
  );
}

function FormField({
  id,
  label,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
  required,
  minLength,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-text-secondary" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        className="w-full rounded-2xl border border-transparent bg-surface-subtle px-4 py-3 text-base text-text-primary shadow-inner outline-none transition focus:border-brand focus:bg-white focus:shadow-soft focus:ring-2 focus:ring-brand/40"
      />
    </div>
  );
}
