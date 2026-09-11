import type { ArticleMetadata } from "../types.js";

const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

export function parseMetadataBlock(raw: string): { body: string; metadata: ArticleMetadata } {
  const match = raw.match(FRONT_MATTER);
  if (!match) {
    return { body: raw.trim(), metadata: {} };
  }

  const metadata: ArticleMetadata = {};
  for (const line of match[1].split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const colon = trimmed.indexOf(":");
    if (colon <= 0) {
      continue;
    }
    const key = trimmed.slice(0, colon).trim().toLowerCase();
    const value = trimmed.slice(colon + 1).trim();
    if (key) {
      metadata[key] = value;
    }
  }

  return { body: raw.slice(match[0].length).trim(), metadata };
}

export function metadataToJson(metadata: ArticleMetadata): string {
  return JSON.stringify(metadata);
}

export function parseStoredMetadata(raw: string | null | undefined): ArticleMetadata {
  if (!raw) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const result: ArticleMetadata = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string") {
        result[key] = value;
      }
    }
    return result;
  } catch {
    return {};
  }
}
