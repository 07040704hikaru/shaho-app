import { createHmac, randomBytes } from "node:crypto";

export const AUTH_TOKEN_STORAGE_KEY = "authToken";

const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

type TokenPayload = {
  userId: string;
  nonce: string;
  exp: number;
};

function getTokenSecret(): string {
  return (
    process.env.AUTH_TOKEN_SECRET ??
    process.env.AUTH_SESSION_SECRET ??
    process.env.AUTH_SECRET ??
    "dev-token-secret"
  );
}

function encodePayload(payload: TokenPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function decodePayload(encoded: string): TokenPayload | null {
  try {
    const json = Buffer.from(encoded, "base64url").toString("utf8");
    return JSON.parse(json) as TokenPayload;
  } catch {
    return null;
  }
}

function sign(encodedPayload: string): string {
  const hmac = createHmac("sha256", getTokenSecret());
  hmac.update(encodedPayload);
  return hmac.digest("base64url");
}

export function createAuthToken(userId: string): string {
  const payload: TokenPayload = {
    userId,
    nonce: randomBytes(16).toString("hex"),
    exp: Date.now() + TOKEN_TTL_MS,
  };
  const encoded = encodePayload(payload);
  const signature = sign(encoded);
  return `${encoded}.${signature}`;
}

export function verifyAuthToken(
  token: string | null | undefined,
): TokenPayload | null {
  if (!token) {
    return null;
  }

  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) {
    return null;
  }

  const expectedSignature = sign(encoded);
  if (expectedSignature !== signature) {
    return null;
  }

  const payload = decodePayload(encoded);
  if (!payload) {
    return null;
  }

  if (payload.exp < Date.now()) {
    return null;
  }

  return payload;
}
