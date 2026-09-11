import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export function timingSafeEqualString(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) {
    timingSafeEqual(a, a);
    return false;
  }
  return timingSafeEqual(a, b);
}

export function hmacSha256Hex(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function randomHex(bytes: number): string {
  return randomBytes(bytes).toString("hex");
}

export function generateLiveApiKey(): string {
  return `uw_live_${randomHex(16)}`;
}

export function keyPrefix(key: string): string {
  if (key.length <= 16) {
    return key;
  }
  return `${key.slice(0, 11)}…${key.slice(-4)}`;
}
