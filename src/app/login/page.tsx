"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        alert("ログインに失敗しました。");
        return;
      }

      const { token } = (await res.json()) as { token: string };
      login(token);
      router.push("/mypage");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main style={{ padding: 24 }}>
      <h2>ログイン</h2>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12, maxWidth: 320 }}>
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="email"
          type="email"
          required
        />
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="password"
          type="password"
          required
        />
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "ログイン中..." : "ログイン"}
        </button>
      </form>
    </main>
  );
}
