import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createAuthToken } from "@/lib/auth/token";

export type AuthFormState = {
  error?: string;
  success?: boolean;
  token?: string;
};

export const AUTH_FORM_INITIAL_STATE: AuthFormState = {};

function readFormValue(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function signUp(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  "use server";

  const email = readFormValue(formData.get("email")).toLowerCase();
  const displayName = readFormValue(formData.get("displayName"));
  const password = readFormValue(formData.get("password"));

  if (!email || !password) {
    return { error: "メールアドレスとパスワードを入力してください。" };
  }

  if (password.length < 8) {
    return { error: "パスワードは8文字以上で入力してください。" };
  }

  const safeDisplayName = displayName || email.split("@")[0];

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "このメールアドレスは既に登録されています。" };
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email,
      displayName: safeDisplayName,
      passwordHash,
    },
  });

  const token = createAuthToken(user.id);
  return { success: true, token };
}

export async function login(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  "use server";

  const email = readFormValue(formData.get("email")).toLowerCase();
  const password = readFormValue(formData.get("password"));

  if (!email || !password) {
    return { error: "メールアドレスとパスワードを入力してください。" };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) {
    return { error: "メールアドレスまたはパスワードが正しくありません。" };
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return { error: "メールアドレスまたはパスワードが正しくありません。" };
  }

  const token = createAuthToken(user.id);
  return { success: true, token };
}

export async function logout(): Promise<void> {
  "use server";
  redirect("/login");
}
