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

function formatBits(escaped: string): string {
  return escaped
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" rel="noopener noreferrer">$1</a>',
    );
}

function formatInline(text: string, resolveLink?: LinkResolver): string {
  const parts = text.split(/(\[\[[^\]]+\]\])/g);
  return parts
    .map((part) => {
      const wiki = part.match(/^\[\[([^\]|#]+)(?:\|([^\]]+))?\]\]$/);
      if (wiki) {
        const target = wiki[1].trim();
        const label = (wiki[2] ?? target).trim();
        const hit = resolveLink?.(target);
        if (hit) {
          return `<a class="wikilink" href="/wiki/${encodeURIComponent(hit.slug)}">${escapeHtml(label)}</a>`;
        }
        return `<a class="wikilink is-missing" href="/bijdragen?slug=${encodeURIComponent(slugify(target))}&title=${encodeURIComponent(target)}">${escapeHtml(label)}</a>`;
      }
      const withTags = part.replace(
        /(^|[\s(])#([A-Za-zÀ-ÿ0-9][A-Za-zÀ-ÿ0-9/_-]{1,39})/g,
        (_all, prefix: string, tag: string) =>
          `${prefix}<a class="tag-inline" href="/tag/${encodeURIComponent(slugify(tag))}">#${escapeHtml(tag)}</a>`,
      );
      if (withTags !== part) {
        const chunks = withTags.split(/(<a class="tag-inline"[\s\S]*?<\/a>)/g);
        return chunks
          .map((chunk) => (chunk.startsWith("<a class=\"tag-inline\"") ? chunk : formatBits(escapeHtml(chunk))))
          .join("");
      }
      return formatBits(escapeHtml(part));
    })
    .join("");
}

export function renderMarkdown(source: string, resolveLink?: LinkResolver): string {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let inCode = false;
  let code: string[] = [];
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

  const flushCode = (): void => {
    if (!inCode) {
      return;
    }
    html.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
    code = [];
    inCode = false;
  };

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCode) {
        flushCode();
      } else {
        flushList();
        inCode = true;
        code = [];
      }
      continue;
    }
    if (inCode) {
      code.push(line);
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushList();
      const level = heading[1].length;
      html.push(`<h${level}>${formatInline(heading[2], resolveLink)}</h${level}>`);
      continue;
    }
    const ul = line.match(/^[-*]\s+(.+)$/);
    if (ul) {
      if (listType !== "ul") {
        flushList();
        listType = "ul";
      }
      list.push(ul[1]);
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
  flushCode();
  flushList();
  return html.join("\n");
}
