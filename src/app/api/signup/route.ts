import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { createAuthToken } from "@/lib/auth/token";

export async function POST(req: Request) {
  try {
    const { email, displayName, password } = (await req.json()) as {
      email?: string;
      displayName?: string;
      password?: string;
    };

    if (!email || !password) {
      return NextResponse.json(
        { message: "メールアドレスとパスワードを入力してください。" },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { message: "パスワードは8文字以上で入力してください。" },
        { status: 400 },
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const safeDisplayName =
      displayName?.trim() && displayName.trim().length > 0
        ? displayName.trim()
        : normalizedEmail.split("@")[0];

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json({ message: "このメールアドレスは既に登録されています。" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        displayName: safeDisplayName,
        passwordHash,
      },
      select: {
        id: true,
      },
    });

    const token = createAuthToken(user.id);
    return NextResponse.json({ token });
  } catch (error) {
    console.error("POST /api/signup failed", error);
    return NextResponse.json({ message: "サーバーエラーが発生しました。" }, { status: 500 });
  }
}
