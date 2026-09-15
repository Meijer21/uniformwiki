export type AiOrigin = "mens" | "ai-ondersteund" | "ai-gegenereerd";

export interface Citation {
  text: string;
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

/** Eén bron per regel. Lijkt het al op een bronvermelding, dan laten we hem staan. */
export function parseCitations(raw: string | undefined): Citation[] {
  if (!raw?.trim()) {
    return [];
  }
  return raw
    .split(/\r?\n|;/)
    .map((line) => formatCitation(line.trim()))
    .filter((line) => line.length > 0)
    .map((text) => ({ text }));
}

export function formatCitation(line: string): string {
  if (!line) {
    return "";
  }
  let text = line.replace(/^[-*]\s+/, "").trim();
  const urlMatch = text.match(/https?:\/\/[^\s)]+/i);
  const hasYear = /\((1[7-9]\d{2}|20\d{2})\)/.test(text) || /\b(1[7-9]\d{2}|20\d{2})\b/.test(text);
  if (urlMatch && !hasYear) {
    const url = urlMatch[0];
    const rest = text.replace(url, "").replace(/\s+/g, " ").trim().replace(/[.,;]+$/, "");
    text = rest
      ? `${rest}. Geraadpleegd via ${url}`
      : `Geraadpleegd via ${url}`;
  }
  if (!/[.!?]$/.test(text)) {
    text += ".";
  }
  return text;
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
