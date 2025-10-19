import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifyAuthToken } from "./token";

export type AuthenticatedUser = Pick<User, "id" | "email" | "displayName">;

export async function getUserFromToken(
  token: string | null | undefined,
): Promise<AuthenticatedUser | null> {
  const payload = verifyAuthToken(token);
  if (!payload) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      email: true,
      displayName: true,
    },
  });

  return user ?? null;
}

export async function requireUserFromToken(
  token: string | null | undefined,
): Promise<AuthenticatedUser> {
  const user = await getUserFromToken(token);
  if (!user) {
    throw new Error("認証情報が無効です。再度ログインしてください。");
  }

  return user;
}
