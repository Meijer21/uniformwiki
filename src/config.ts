import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadDotEnv(): void {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) {
    return;
  }

  const text = readFileSync(envPath, "utf8");
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const eq = line.indexOf("=");
    if (eq <= 0) {
      continue;
    }
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadDotEnv();

function requiredFallback(name: string, fallback: string): string {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : fallback;
}

export const config = {
  port: Number(process.env.PORT ?? 43121),
  host: process.env.HOST ?? "0.0.0.0",
  sqlitePath: requiredFallback("SQLITE_PATH", "./data/wiki.db"),
  adminApiKey: process.env.ADMIN_API_KEY?.trim() ?? "",
  fluentcartSecret: process.env.FLUENTCART_WEBHOOK_SECRET?.trim() ?? "",
  publicBaseUrl: requiredFallback("PUBLIC_BASE_URL", "http://127.0.0.1:43121").replace(/\/$/, ""),
  siteName: requiredFallback("SITE_NAME", "UniformWiki"),
  nodeEnv: process.env.NODE_ENV ?? "development",
};

export function isProduction(): boolean {
  return config.nodeEnv === "production";
}
