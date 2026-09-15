export const SEED_ARTICLES: Array<{
  slug: string;
  title: string;
  category: string;
  dienst: string;
  summary: string;
  body: string;
  metadata: Record<string, string>;
}> = [
  {
    slug: "welkom-bij-uniformwiki",
    title: "Welkom bij UniformWiki",
    category: "Over",
    dienst: "",
    summary: "Kennisbank voor en door mensen in uniform. Gehost door THISLINE.",
    body: `UniformWiki is de open kennisbank van THISLINE. Voor brandweer, ambulance, politie, defensie en handhaving. Mensen lezen de pagina’s. Agents halen dezelfde goedgekeurde tekst op via MCP.

Je zoekt op [[kolom]], daarna op thema, daarna op het artikel. Hoe gerichter je klikt, hoe smaller de set. Dat is geen spel en geen medaille. Het is statische indeling.

Zie [[Hoe je bijdraagt]], [[Wat is een uniform?]] en [[Samenhang]]. Ontbreekt er iets, dan vraagt de wiki dat hardop.`,
    metadata: {
      licentie: "CC-BY-SA-4.0",
      trefwoorden: "uniformwiki, thisline, wiki",
      ai: "mens",
      bronnen: `THISLINE. (2026). Over THISLINE. https://thisline.eu
THISLINE. (2026). Merkwaarheidsdocument v2.0.`,
    },
  },
  {
    slug: "hoe-je-bijdraagt",
    title: "Hoe je bijdraagt",
    category: "Over",
    dienst: "",
    summary: "Schrijf mee zonder account. Bronnen en AI-herkomst zijn verplicht.",
    body: `Iedereen in uniform mag een artikel voorstellen. Geen Git, geen editor, geen inlog.

1. Kies je [[kolom]]
2. Schrijf in gewone taal
3. Zet bronnen eronder, één per regel
4. Zeg of de tekst van een mens is, of (deels) met AI

Koppel naar bestaande pagina’s met dubbele haken, zoals [[Wat is een uniform?]]. Bestaan ze nog niet, dan ziet de volgende bezoeker: hier ontbreekt nog iets, weet jij daar wat van.

Persoonsgegevens (BSN, e-mail, telefoon) worden automatisch weggehaald.`,
    metadata: {
      licentie: "CC-BY-SA-4.0",
      trefwoorden: "bijdragen, bronvermelding, ai",
      ai: "mens",
      bronnen: `THISLINE. (2026). UniformWiki, bijdragen. https://wiki.thisline.eu/hoe-je-bijdraagt`,
    },
  },
  {
    slug: "wat-is-een-uniform",
    title: "Wat is een uniform?",
    category: "Begrippen",
    dienst: "",
    summary: "Herkenbaarheid, voorschrift en gelijkheid. Het verschil met vrije beroepskleding.",
    body: `Een uniform is kleding die een organisatie voorschrijft zodat de drager herkenbaar is als onderdeel van die organisatie. Kleur of logo alleen is niet genoeg.

## Drie kenmerken

1. Herkenbaarheid — collega’s en burgers zien de rol
2. Voorschrift — model, kleur en gebruik liggen vast
3. Gelijkheid — binnen dezelfde functie ziet het er bewust hetzelfde uit

Bedrijfskleding zonder dwingend model is geen uniform. Een hesje over een eigen jas is een voorgeschreven laag, nog geen volledig uniform.

Dit onderscheid loopt terug in [[Hoge zichtbaarheid]], [[Uitrukkleding]], [[BOA-kleding]] en de [[Basisset]].`,
    metadata: {
      licentie: "CC-BY-SA-4.0",
      trefwoorden: "definitie, beroepskleding, voorschrift",
      ai: "mens",
      bronnen: `Van Dale. (z.d.). Uniform.
Rijksoverheid. (z.d.). Beroepskleding en arboregels. https://www.rijksoverheid.nl`,
    },
  },
  {
    slug: "hoge-zichtbaarheid",
    title: "Hoge zichtbaarheid",
    category: "Normen",
    dienst: "Brandweer, Ambulance, Politie, Handhaving",
    summary: "EN ISO 20471: klassen, oppervlak en waarom een hesje geen complete jas is.",
    body: `Hoge zichtbaarheid is kleding die je in het donker en bij tegenlicht laat opvallen door fluorescerende stof en retroreflectie. In Nederland is EN ISO 20471 de maatstaf.

De norm kent drie klassen. Klasse 3 dekt het grootste oppervlak en hoort bij werk aan de rijbaan. Een los hesje is vaak klasse 2. Het vervangt geen [[Uitrukkleding]] en geen [[Basisset]].

Politie, ambulance, brandweer en handhaving delen deze eis op de weg, elk met een eigen jas eronder. Zie ook [[Zichtbaarheid op de weg]] en [[Toezicht op evenementen]].`,
    metadata: {
      licentie: "CC-BY-SA-4.0",
      trefwoorden: "EN ISO 20471, hesje, zichtbaarheid",
      ai: "ai-ondersteund",
      bronnen: `Nederlands Normalisatie-instituut. (2013). NEN-EN-ISO 20471:2013 High visibility clothing.
Inspectie SZW. (z.d.). Persoonlijke beschermingsmiddelen. https://www.nlarbeidsinspectie.nl`,
    },
  },
  {
    slug: "uitrukkleding",
    title: "Uitrukkleding",
    category: "Uitrusting",
    dienst: "Brandweer",
    summary: "De set waarin je uitrukt: lagen, normen en wat er níet bij hoort op het terrein.",
    body: `Uitrukkleding is de voorgeschreven set van de brandweer voor inzet. Geen kazernekleding, geen sportshirt, geen eigen jas.

De jas en broek beschermen tegen hitte en mechanische belasting. Daarbovenop komt vaak [[Hoge zichtbaarheid]] als je langs de weg werkt. [[Ademlucht]] is een apart systeem en geen onderdeel van de stof, maar hoort wél bij dezelfde inzet.

Wat hier nog ontbreekt in de wiki, vullen collega’s aan: [[Kazernekleding]], [[Bevelvoering]].`,
    metadata: {
      licentie: "CC-BY-SA-4.0",
      trefwoorden: "uitrukkleding, brandweer, PBM",
      ai: "ai-ondersteund",
      bronnen: `Nederlands Instituut Publieke Veiligheid. (z.d.). Brandweer. https://nipv.nl
NEN. (z.d.). Beschermende kleding voor brandweeroptreden.`,
    },
  },
  {
    slug: "boa-kleding",
    title: "BOA-kleding",
    category: "Uitrusting",
    dienst: "Handhaving",
    summary: "Voorschrift per domein, en waarom BOA’s herkenbaar anders moeten zijn dan de politie.",
    body: `BOA-kleding is het voorgeschreven tenue van een buitengewoon opsporingsambtenaar. Domein, gemeente en werkgever bepalen het model. Het is een [[Wat is een uniform?|uniform]], geen vrije bedrijfskleding.

Het verschil met politie moet zichtbaar blijven. Burgers die een BOA voor een agent aanzien, is een veiligheidsprobleem. Zie [[Onderscheid met politie]] en [[Gemeente en huisstijl]].

Op evenementen komt daar [[Hoge zichtbaarheid]] bij.`,
    metadata: {
      licentie: "CC-BY-SA-4.0",
      trefwoorden: "BOA, handhaving, domein",
      ai: "ai-ondersteund",
      bronnen: `Ministerie van Justitie en Veiligheid. (z.d.). Buitengewoon opsporingsambtenaar. https://www.rijksoverheid.nl
Politiewet 2012. https://wetten.overheid.nl`,
    },
  },
  {
    slug: "basisset",
    title: "Basisset",
    category: "Uitrusting",
    dienst: "Politie",
    summary: "Het dagelijkse tenue van de basispolitiezorg, inclusief wat de wet daarover raakt.",
    body: `De basisset is het dagelijkse tenue van de politie op straat. Geen [[Ambtskostuum]], geen eigen trui over het shirt.

Herkenbaarheid is het punt: burger ziet politie, collega ziet functie. [[Distinctie]] hoort daarbij, zonder dat het een modeshow wordt. Op de rijbaan telt [[Hoge zichtbaarheid]].

Wettelijke haakjes staan onder [[Politiewet en kleding]]. Dit artikel is geen ambtsinstructie.`,
    metadata: {
      licentie: "CC-BY-SA-4.0",
      trefwoorden: "politie, basisset, tenue",
      ai: "ai-ondersteund",
      bronnen: `Politiewet 2012. https://wetten.overheid.nl/BWBR0031788
Politie. (z.d.). Over de politie. https://www.politie.nl`,
    },
  },
  {
    slug: "gevechtskleding",
    title: "Gevechtskleding",
    category: "Uitrusting",
    dienst: "Defensie",
    summary: "Inzettenue versus kazerne, en hoe defensie zich civiel onderscheidt.",
    body: `Gevechtskleding is het inzettenue van Defensie. Camouflage, lagen en uitrusting horen bij de opdracht, niet bij de foto.

Op de kazerne geldt een ander voorschrift. In de wijk, naast politie en brandweer, telt [[Civiel optreden]]: herkenbaar militair, niet verward met [[Basisset]] of [[Uitrukkleding]].

[[Baret en insigne]] en [[Onderscheidingen]] zijn aparte pagina’s. Die vullen we met collega’s die het werk doen.`,
    metadata: {
      licentie: "CC-BY-SA-4.0",
      trefwoorden: "defensie, gevechtskleding, camouflage",
      ai: "ai-ondersteund",
      bronnen: `Ministerie van Defensie. (z.d.). Kleding en uitrusting. https://www.defensie.nl
Rijksoverheid. (z.d.). Defensie. https://www.rijksoverheid.nl`,
    },
  },
  {
    slug: "ambulance-herkenning",
    title: "Herkenning ambulance",
    category: "Uitrusting",
    dienst: "Ambulance",
    summary: "Waarom de burger de ambulance-eenheid in één oogopslag moet herkennen.",
    body: `Ambulancekleding is een [[Wat is een uniform?|uniform]]: voorgeschreven, herkenbaar, gelijk binnen de functie. Op straat en op de rijbaan komt daar [[Hoge zichtbaarheid]] bij.

Hygiëne is geen sluitstuk. Wat mee naar huis gaat, is een risico. Zie [[Hygiëne en kleding]].

De meldkamer draagt iets anders dan de wagen. Dat onderscheid blijft staan onder [[Meldkamer en kleding]].`,
    metadata: {
      licentie: "CC-BY-SA-4.0",
      trefwoorden: "ambulance, herkenning, AZN",
      ai: "ai-ondersteund",
      bronnen: `Ambulancezorg Nederland. (z.d.). Over ambulancezorg. https://www.ambulancezorg.nl
Rijksoverheid. (z.d.). Ambulancezorg. https://www.rijksoverheid.nl`,
    },
  },
  {
    slug: "kennisgraaf",
    title: "Samenhang",
    category: "Over",
    dienst: "",
    summary: "Artikelen, tags, kolommen en verwijzingen in één beeld. Wat bij elkaar hoort, staat bij elkaar.",
    body: `Samenhang toont hoe pagina’s aan elkaar zitten: [[kolom]], tag, categorie en [[wikilink]]. Klik je dieper, dan blijft alleen wat bij dat thema hoort.

Lege plekken zijn geen falen. Ze zijn het verzoek: weet jij daar wat van. Open [[Hoe je bijdraagt]] en vul het aan, met bron.`,
    metadata: {
      licentie: "CC-BY-SA-4.0",
      trefwoorden: "samenhang, wikilink, tag",
      ai: "mens",
      bronnen: `THISLINE. (2026). UniformWiki. https://wiki.thisline.eu/samenhang`,
    },
  },
];
