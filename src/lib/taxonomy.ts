export type KolomId = "brandweer" | "ambulance" | "politie" | "defensie" | "handhaving";

export interface Thema {
  slug: string;
  title: string;
  summary: string;
}

export interface Kolom {
  id: KolomId;
  label: string;
  summary: string;
  themes: Thema[];
}

/** Statische kolommen en thema's. Geen scores, geen medailles: alleen gerichte ingangen. */
export const KOLOMMEN: Kolom[] = [
  {
    id: "brandweer",
    label: "Brandweer",
    summary: "Uitrukken, ademlucht, bevelvoering en herkenbaarheid op het terrein.",
    themes: [
      { slug: "uitrukkleding", title: "Uitrukkleding", summary: "Lagen, normen en wanneer welke set aan gaat." },
      { slug: "ademlucht", title: "Ademlucht", summary: "Toestel, inzetduur en wat het uniform daarbij vraagt." },
      { slug: "bevelvoering", title: "Bevelvoering", summary: "Rollen, herkenning en wie wat draagt op het terrein." },
      { slug: "hoge-zichtbaarheid-brandweer", title: "Zichtbaarheid bij de brandweer", summary: "EN ISO 20471 in combinatie met uitrukkleding." },
      { slug: "kazernekleding", title: "Kazernekleding", summary: "Wat je draagt op de post, los van de inzet." },
    ],
  },
  {
    id: "ambulance",
    label: "Ambulance",
    summary: "Herenkenning, hygiëne, hoge zichtbaarheid en kleding tijdens de rit.",
    themes: [
      { slug: "ambulance-herkenning", title: "Herkenning ambulance", summary: "Waarom de burger je in één oogopslag moet zien." },
      { slug: "hygiene-kleding", title: "Hygiëne en kleding", summary: "Wassen, wisselen en wat niet mee naar huis mag." },
      { slug: "hoge-zichtbaarheid-ambulance", title: "Zichtbaarheid op de weg", summary: "Hesje, jas en werk op de rijbaan." },
      { slug: "meldkamer-ambulance", title: "Meldkamer en kleding", summary: "Wat er wél en niet geldt achter de centralist." },
    ],
  },
  {
    id: "politie",
    label: "Politie",
    summary: "Ambtskostuum, basisset, distinguatie en wat de wet voorschrijft.",
    themes: [
      { slug: "ambtskostuum", title: "Ambtskostuum", summary: "Wanneer het kostuum verplicht is en wat het uitstraalt." },
      { slug: "basispolitie-kleding", title: "Basisset", summary: "Dagelijks tenue, geweldsmiddelen en zichtbaarheid." },
      { slug: "distinguatie", title: "Distinguatie", summary: "Rang, functie en hoe je die leest zonder er een show van te maken." },
      { slug: "politiewet-kleding", title: "Politiewet en kleding", summary: "Wettelijke haakjes, niet de kantinepraat." },
    ],
  },
  {
    id: "defensie",
    label: "Defensie",
    summary: "Gevechtskleding, onderscheidingen en wat civiel en militair scheidt.",
    themes: [
      { slug: "gevechtskleding", title: "Gevechtskleding", summary: "Camouflage, lagen en inzet versus kazerne." },
      { slug: "onderscheidingen", title: "Onderscheidingen", summary: "Wat mag, wat moet, en wat je niet zelf bedenkt." },
      { slug: "civiel-optreden", title: "Civiel optreden", summary: "Defensie in de wijk: herkenbaarheid naast politie en brandweer." },
      { slug: "baret-en-insigne", title: "Baret en insigne", summary: "Onderdeelherkenning zonder het tot folklore te maken." },
    ],
  },
  {
    id: "handhaving",
    label: "Handhaving",
    summary: "BOA, gemeente, domeinen en het verschil met politie op straat.",
    themes: [
      { slug: "boa-kleding", title: "BOA-kleding", summary: "Voorschrift per domein en waarom dat strak ligt." },
      { slug: "onderscheid-politie", title: "Onderscheid met politie", summary: "Wat burgers verwarren, en hoe kleding dat voorkomt." },
      { slug: "gemeente-huisstijl", title: "Gemeente en huisstijl", summary: "Lokale kleuren versus landelijke herkenning." },
      { slug: "toezicht-evenement", title: "Toezicht op evenementen", summary: "Hesje, jas en bevoegdheid zichtbaar houden." },
    ],
  },
];

export function kolomById(id: string | undefined): Kolom | undefined {
  if (!id) {
    return undefined;
  }
  const key = id.trim().toLowerCase();
  return KOLOMMEN.find((kolom) => kolom.id === key || kolom.label.toLowerCase() === key);
}

export function kolomByLabel(label: string | undefined): Kolom | undefined {
  if (!label) {
    return undefined;
  }
  return kolomById(label);
}
