export type PromoId = "platform" | "pulse" | "cards";

export interface Promo {
  id: PromoId;
  eyebrow: string;
  title: string;
  text: string;
  href: string;
  cta: string;
}

const PLATFORM: Promo = {
  id: "platform",
  eyebrow: "THISLINE",
  title: "Het platform",
  text: "Community, kennis en collega’s uit alle kolommen. Geen werkgever die meekijkt.",
  href: "https://thisline.eu",
  cta: "Naar thisline.eu",
};

const PULSE: Promo = {
  id: "pulse",
  eyebrow: "Pulse",
  title: "Microlearning in vijf minuten",
  text: "Eén onderwerp, op je telefoon, tijdens de dienst. Voor leden zit het erbij.",
  href: "https://thisline.eu",
  cta: "Bekijk Pulse",
};

const CARDS: Promo = {
  id: "cards",
  eyebrow: "Front Line Cards",
  title: "Kaarten voor op zak",
  text: "Korte, toetstbare kennis. Geen poster op intranet waar niemand naar omkijkt.",
  href: "https://thisline.eu",
  cta: "Bekijk de kaarten",
};

export type PromoPlacement = "home" | "article" | "search" | "gap" | "graaf";

/** Vaste blokken van THISLINE. Geen verkochte advertenties, geen veiling. */
export function promosFor(placement: PromoPlacement, dienst?: string): Promo[] {
  const kolom = (dienst ?? "").toLowerCase();
  if (placement === "home") {
    return [PLATFORM, PULSE];
  }
  if (placement === "gap") {
    return [PLATFORM];
  }
  if (placement === "graaf") {
    return [CARDS];
  }
  if (placement === "search") {
    return kolom.includes("brandweer") || kolom.includes("ambulance") ? [PULSE, PLATFORM] : [PLATFORM, PULSE];
  }
  if (kolom.includes("politie") || kolom.includes("handhaving")) {
    return [CARDS, PLATFORM];
  }
  if (kolom.includes("defensie")) {
    return [PLATFORM, CARDS];
  }
  return [PULSE, PLATFORM];
}
