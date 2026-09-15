export type AiOrigin = "mens" | "ai-ondersteund" | "ai-gegenereerd";

export interface Citation {
  name: string;
  url?: string;
}

export interface SourceBlock {
  citations: Citation[];
  ai: AiOrigin | "";
  missingSources: boolean;
  missingAi: boolean;
}

const AI_LABEL: Record<AiOrigin, string> = {
  mens: "Deze tekst is door een mens geschreven. Er is geen generatieve AI gebruikt voor de inhoud.",
  "ai-ondersteund": "Deze tekst is met AI-ondersteuning opgesteld en daarna nagekeken door een mens voordat hij live ging.",
  "ai-gegenereerd": "Deze tekst is met AI opgesteld. Een mens heeft hem nagekeken voordat hij live ging. Controleer altijd de bronnen.",
};

export function parseAiOrigin(value: string | undefined): AiOrigin | "" {
  const raw = (value ?? "").trim().toLowerCase();
  if (raw === "mens" || raw === "human") {
    return "mens";
  }
  if (raw === "ai-ondersteund" || raw === "ai-ondersteuning" || raw === "ai-assisted") {
    return "ai-ondersteund";
  }
  if (raw === "ai-gegenereerd" || raw === "ai" || raw === "ai-generated") {
    return "ai-gegenereerd";
  }
  return "";
}

export function aiLabel(origin: AiOrigin | ""): string {
  if (!origin) {
    return "De herkomst van deze tekst (mens of AI) is nog niet vastgelegd. Dat horen we wél te vermelden.";
  }
  return AI_LABEL[origin];
}

export function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function parseCitations(raw: string | undefined): Citation[] {
  if (!raw?.trim()) {
    return [];
  }
  const out: Citation[] = [];
  const seen = new Set<string>();
  for (const line of raw.split(/\r?\n|;/)) {
    const parsed = parseCitationLine(line);
    if (!parsed) {
      continue;
    }
    const key = `${parsed.name.toLowerCase()}|${parsed.url ?? ""}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(parsed);
  }
  return out;
}

function parseCitationLine(line: string): Citation | undefined {
  let text = line.replace(/^[-*]\s+/, "").trim();
  if (!text) {
    return undefined;
  }
  const pipe = text.match(/^(.+?)\s+\|\s+(https?:\/\/\S+)$/i);
  if (pipe) {
    const url = pipe[2].replace(/[.,);]+$/, "");
    return { name: pipe[1].trim(), url: isSafeHttpUrl(url) ? url : undefined };
  }
  const urlMatch = text.match(/https?:\/\/[^\s)]+/i);
  if (urlMatch) {
    const url = urlMatch[0].replace(/[.,);]+$/, "");
    const name = text.replace(urlMatch[0], "").replace(/\s+/g, " ").trim().replace(/[.,;]+$/, "");
    return {
      name: name || url,
      url: isSafeHttpUrl(url) ? url : undefined,
    };
  }
  return { name: text.replace(/[.,;]+$/, "") };
}

export function serializeCitations(items: Citation[]): string {
  return items
    .map((item) => {
      const name = item.name.trim();
      const url = item.url?.trim() ?? "";
      if (!name && !url) {
        return "";
      }
      if (name && url && isSafeHttpUrl(url)) {
        return `${name} | ${url}`;
      }
      return name || url;
    })
    .filter(Boolean)
    .join("\n");
}

export function citationsFromFields(names: string[], urls: string[]): string {
  const count = Math.max(names.length, urls.length);
  const items: Citation[] = [];
  for (let i = 0; i < count; i += 1) {
    items.push({ name: (names[i] ?? "").trim(), url: (urls[i] ?? "").trim() });
  }
  return serializeCitations(items);
}

export function sourceBlock(bronnen: string | undefined, ai: string | undefined): SourceBlock {
  const citations = parseCitations(bronnen);
  const origin = parseAiOrigin(ai);
  return {
    citations,
    ai: origin,
    missingSources: citations.length === 0,
    missingAi: origin === "",
  };
}
