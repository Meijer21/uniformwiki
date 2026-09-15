import { config, isProduction } from "../config.js";
import { hmacSha256Hex, timingSafeEqualString } from "./crypto.js";

const COOKIE = "uw_admin";
const MAX_AGE_SECONDS = 60 * 60 * 12;

function sign(payload: string): string {
  const secret = config.adminApiKey || "uniformwiki-dev-session";
  return hmacSha256Hex(secret, payload);
}

export function createAdminCookie(issuedAt = Date.now()): string {
  const payload = String(issuedAt);
  const value = `${payload}.${sign(payload)}`;
  const secure = isProduction() || config.publicBaseUrl.startsWith("https://");
  const parts = [
    `${COOKIE}=${value}`,
    "Path=/beheer",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${MAX_AGE_SECONDS}`,
  ];
  if (secure) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

export function clearAdminCookie(): string {
  return `${COOKIE}=; Path=/beheer; HttpOnly; SameSite=Strict; Max-Age=0`;
}

export function parseCookies(header: string | string[] | undefined): Record<string, string> {
  const raw = Array.isArray(header) ? header.join(";") : (header ?? "");
  const out: Record<string, string> = {};
  for (const part of raw.split(";")) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq <= 0) {
      continue;
    }
    out[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
  return out;
}

export function isAdminSession(cookieHeader: string | string[] | undefined): boolean {
  const token = parseCookies(cookieHeader)[COOKIE];
  if (!token) {
    return false;
  }
  const dot = token.lastIndexOf(".");
  if (dot <= 0) {
    return false;
  }
  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  if (!timingSafeEqualString(signature, sign(payload))) {
    return false;
  }
  const issuedAt = Number(payload);
  if (!Number.isFinite(issuedAt)) {
    return false;
  }
  return Date.now() - issuedAt < MAX_AGE_SECONDS * 1000;
}
