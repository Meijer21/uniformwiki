const MAX_BODY = 50_000;

function stripTags(input: string): string {
  return input
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, "")
    .replace(/<\/?[a-zA-Z][^>]*>/g, "")
    .replace(/<!--[\s\S]*?-->/g, "");
}

function decodeEntities(input: string): string {
  return input
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Alleen platte tekst, lijsten en interne @-koppelingen.
 * Geplakte markdown wordt teruggesnoeid. Geen code, HTML of externe links in de tekst.
 */
export function sanitizeWikiBody(input: string): string {
  let text = decodeEntities(stripTags(input.replace(/\0/g, "")));
  text = text.replace(/```[\s\S]*?```/g, (block) =>
    block.replace(/```[a-z0-9+-]*\n?/gi, "").replace(/```/g, "").trim(),
  );
  text = text.replace(/`([^`]+)`/g, "$1");
  text = text.replace(/!?\[[^\]]*\]\(([^)]+)\)/g, (_all, href: string) => {
    const inner = _all.match(/^!?\[([^\]]*)\]/);
    const label = inner?.[1]?.trim() || "";
    if (isHttpUrl(href) && /\/wiki\//i.test(href)) {
      const slug = href.split("/wiki/")[1]?.split(/[?#]/)[0] ?? "";
      return slug ? `@[${decodeURIComponent(slug)}]` : label;
    }
    return label;
  });
  text = text.replace(/\[\[([^\]|#]+)(?:\|([^\]]+))?\]\]/g, (_all, target: string, label?: string) => {
    return `@[${(label ?? target).trim()}]`;
  });
  text = text.replace(/^#{1,6}\s+/gm, "");
  text = text.replace(/\*\*([^*]+)\*\*/g, "$1");
  text = text.replace(/__([^_]+)__/g, "$1");
  text = text.replace(/(^|[^\w])\*([^*\n]+)\*(?!\w)/g, "$1$2");
  text = text.replace(/^>\s?/gm, "");
  text = text.replace(/^\|.*\|$/gm, "");
  text = text.replace(/^[-–—*•▪◦]\s*\n(?=\S)/gm, "- ");
  text = text.replace(/^(\s*)[*+•▪◦]\s+/gm, "$1- ");
  text = text.replace(/^(\s*)[-–—](?=\S)/gm, "$1- ");
  text = text.replace(/^(\s*)[-–—*+•]\s+/gm, "$1- ");
  text = text.replace(/\bjavascript:/gi, "");
  text = text.replace(/\bdata:text\/html/gi, "");
  text = text.replace(/\bhttps?:\/\/[^\s)]+/gi, "");
  text = text.replace(/\r\n/g, "\n").replace(/\u00a0/g, " ");
  text = text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n");
  return text.trim().slice(0, MAX_BODY);
}
