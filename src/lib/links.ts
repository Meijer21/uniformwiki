import { parseStoredMetadata } from "./metadata.js";
import { slugify } from "./slug.js";
import type { ArticleRow } from "../types.js";

export const DIENSTEN = [
  "Brandweer",
  "Ambulance",
  "Politie",
  "Defensie",
  "Handhaving",
  "Meldkamer",
  "Overig",
] as const;

const WIKILINK_RE = /\[\[([^\]|#]+)(?:\|([^\]]+))?\]\]/g;
const AT_BRACKET_RE = /@\[([^\]]+)\]/g;
const AT_TOKEN_RE = /(^|[\s(])@([A-Za-zÀ-ÿ0-9][A-Za-zÀ-ÿ0-9_-]{1,79})/g;
const HASHTAG_RE = /(^|[\s(])#([A-Za-zÀ-ÿ0-9][A-Za-zÀ-ÿ0-9/_-]{1,39})/g;

export interface WikiLink {
  target: string;
  label: string;
}

export interface ResolvedLink {
  slug: string;
  title: string;
}

export type LinkResolver = (target: string) => ResolvedLink | undefined;

export function splitList(value: string | undefined): string[] {
  if (!value) {
    return [];
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of value.split(/[,;|/]+/)) {
    const trimmed = part.trim();
    if (!trimmed) {
      continue;
    }
    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

export function parseWikiLinks(body: string): WikiLink[] {
  const out: WikiLink[] = [];
  const seen = new Set<string>();
  const add = (target: string, label: string): void => {
    const trimmed = target.trim();
    if (!trimmed) {
      return;
    }
    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    out.push({ target: trimmed, label: label.trim() || trimmed });
  };

  WIKILINK_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = WIKILINK_RE.exec(body))) {
    add(match[1], match[2] ?? match[1]);
  }
  AT_BRACKET_RE.lastIndex = 0;
  while ((match = AT_BRACKET_RE.exec(body))) {
    add(match[1], match[1]);
  }
  AT_TOKEN_RE.lastIndex = 0;
  while ((match = AT_TOKEN_RE.exec(body))) {
    add(match[2], match[2]);
  }
  return out;
}

export function parseHashtags(body: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  HASHTAG_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = HASHTAG_RE.exec(body))) {
    const tag = match[2].replace(/_/g, " ").trim();
    const key = tag.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(tag);
  }
  return out;
}

export function articleTags(article: ArticleRow): string[] {
  const meta = parseStoredMetadata(article.metadata);
  return splitList([meta.trefwoorden, meta.tags].filter(Boolean).join(", ")).concat(parseHashtags(article.body));
}

export function uniqueLabels(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) {
      continue;
    }
    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

export function articleDiensten(article: ArticleRow): string[] {
  const meta = parseStoredMetadata(article.metadata);
  return uniqueLabels([
    ...splitList(article.dienst ?? ""),
    ...splitList(meta.dienst),
    ...splitList(meta.diensten),
  ]);
}

export function mergeTagLists(...parts: Array<string | undefined>): string {
  return uniqueLabels(parts.flatMap((part) => splitList(part))).join(", ");
}

export function buildLinkResolver(articles: ArticleRow[]): LinkResolver {
  const bySlug = new Map<string, ResolvedLink>();
  const byTitle = new Map<string, ResolvedLink>();
  for (const article of articles) {
    const resolved = { slug: article.slug, title: article.title };
    bySlug.set(article.slug.toLowerCase(), resolved);
    byTitle.set(article.title.toLowerCase(), resolved);
    byTitle.set(slugify(article.title), resolved);
  }
  return (target: string) => {
    const trimmed = target.trim();
    if (!trimmed) {
      return undefined;
    }
    return bySlug.get(trimmed.toLowerCase()) ?? byTitle.get(trimmed.toLowerCase()) ?? byTitle.get(slugify(trimmed));
  };
}
