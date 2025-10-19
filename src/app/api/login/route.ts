import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { createAuthToken } from "@/lib/auth/token";

export async function POST(req: Request) {
  try {
    const { email, password } = (await req.json()) as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      return NextResponse.json(
        { message: "メールアドレスとパスワードを入力してください。" },
        { status: 400 },
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user || !user.passwordHash) {
      return NextResponse.json({ message: "メールアドレスまたはパスワードが正しくありません。" }, { status: 401 });
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ message: "メールアドレスまたはパスワードが正しくありません。" }, { status: 401 });
    }

    const token = createAuthToken(user.id);
    return NextResponse.json({ token });
  } catch (error) {
    console.error("POST /api/login failed", error);
    return NextResponse.json({ message: "サーバーエラーが発生しました。" }, { status: 500 });
  }
}
