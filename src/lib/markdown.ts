import { slugify } from "./slug.js";
import type { LinkResolver } from "./links.js";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function wikiAnchor(target: string, label: string, resolveLink?: LinkResolver): string {
  const hit = resolveLink?.(target);
  if (hit) {
    return `<a class="wikilink" href="/wiki/${encodeURIComponent(hit.slug)}">${escapeHtml(label)}</a>`;
  }
  return `<a class="wikilink is-missing" href="/bijdragen?slug=${encodeURIComponent(slugify(target))}&title=${encodeURIComponent(target)}&vast=1">${escapeHtml(label)}</a>`;
}

function formatInline(text: string, resolveLink?: LinkResolver): string {
  const parts = text.split(/(\[\[[^\]]+\]\]|@\[[^\]]+\]|@[A-Za-zÀ-ÿ0-9][A-Za-zÀ-ÿ0-9_-]{1,79})/g);
  return parts
    .map((part) => {
      const wiki = part.match(/^\[\[([^\]|#]+)(?:\|([^\]]+))?\]\]$/);
      if (wiki) {
        return wikiAnchor(wiki[1].trim(), (wiki[2] ?? wiki[1]).trim(), resolveLink);
      }
      const atBracket = part.match(/^@\[([^\]]+)\]$/);
      if (atBracket) {
        return wikiAnchor(atBracket[1].trim(), atBracket[1].trim(), resolveLink);
      }
      const atToken = part.match(/^@([A-Za-zÀ-ÿ0-9][A-Za-zÀ-ÿ0-9_-]{1,79})$/);
      if (atToken) {
        return wikiAnchor(atToken[1], atToken[1].replace(/-/g, " "), resolveLink);
      }
      return escapeHtml(part);
    })
    .join("");
}

export function renderMarkdown(source: string, resolveLink?: LinkResolver): string {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let list: string[] = [];
  let listType: "ul" | "ol" | null = null;

  const flushList = (): void => {
    if (list.length === 0 || !listType) {
      return;
    }
    const tag = listType;
    html.push(`<${tag}>`);
    for (const item of list) {
      html.push(`<li>${formatInline(item, resolveLink)}</li>`);
    }
    html.push(`</${tag}>`);
    list = [];
    listType = null;
  };

  for (const line of lines) {
    if (line.startsWith("```")) {
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushList();
      html.push(`<p><strong>${formatInline(heading[2], resolveLink)}</strong></p>`);
      continue;
    }
    const ul = line.match(/^\s*[-–—*+•▪◦]\s+(.*)$/) || line.match(/^\s*[-–—*+•▪◦](?!\s)(.+)$/);
    if (ul && !/^---+$/.test(line.trim())) {
      if (listType !== "ul") {
        flushList();
        listType = "ul";
      }
      list.push(ul[1].trim());
      continue;
    }
    const ol = line.match(/^\d+\.\s+(.+)$/);
    if (ol) {
      if (listType !== "ol") {
        flushList();
        listType = "ol";
      }
      list.push(ol[1]);
      continue;
    }
    if (!line.trim()) {
      flushList();
      continue;
    }
    flushList();
    html.push(`<p>${formatInline(line, resolveLink)}</p>`);
  }
  flushList();
  return html.join("\n");
}
