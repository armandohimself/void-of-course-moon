import "server-only";

import { randomUUID } from "node:crypto";

import { signValue, verifySignedValue } from "@/lib/crypto";

const MAX_AGE_MS = 10 * 60 * 1000;

export function createGoogleOAuthState() {
  const payload = JSON.stringify({ nonce: randomUUID(), ts: Date.now() });
  const encoded = Buffer.from(payload, "utf8").toString("base64url");
  const signature = signValue(encoded);
  return `${encoded}.${signature}`;
}

export function verifyGoogleOAuthState(state: string) {
  const [encoded, signature] = state.split(".");
  if (!encoded || !signature || !verifySignedValue(encoded, signature)) {
    return false;
  }

  const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as {
    ts: number;
  };

  return Number.isFinite(parsed.ts) && Date.now() - parsed.ts <= MAX_AGE_MS;
}
