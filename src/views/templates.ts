import { config } from "../config.js";
import { aiLabel, sourceBlock } from "../lib/citations.js";
import { findGaps } from "../lib/gaps.js";
import type { ArticleNeighborhood, RelatedArticle } from "../lib/graph.js";
import { buildLinkResolver } from "../lib/links.js";
import { escapeHtml, renderMarkdown } from "../lib/markdown.js";
import { parseStoredMetadata } from "../lib/metadata.js";
import { promosFor, type Promo, type PromoPlacement } from "../lib/promos.js";
import { KOLOMMEN } from "../lib/taxonomy.js";
import type { ApiKeyRow, ArticleRow, CategoryCount, RevisionRow } from "../types.js";

export interface PageOptions {
  title: string;
  description: string;
  path: string;
  jsonLd?: Record<string, unknown>;
  scripts?: string[];
  jsonBlock?: { id: string; json: string };
}

function absoluteUrl(path: string): string {
  return `${config.publicBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

function navLink(href: string, label: string, current: string): string {
  const active = current === href || (href !== "/" && current.startsWith(href));
  return `<a href="${href}" class="${active ? "is-active" : ""}">${label}</a>`;
}

function promoCard(promo: Promo): string {
  return `<aside class="promo">
    <p class="eyebrow">${escapeHtml(promo.eyebrow)}</p>
    <h2 class="h3">${escapeHtml(promo.title)}</h2>
    <p>${escapeHtml(promo.text)}</p>
    <a class="btn btn-primary btn-sm" href="${escapeHtml(promo.href)}" rel="noopener noreferrer">${escapeHtml(promo.cta)}</a>
  </aside>`;
}

function promoRow(placement: PromoPlacement, dienst?: string): string {
  const items = promosFor(placement, dienst);
  if (!items.length) {
    return "";
  }
  return `<div class="promo-row">${items.map(promoCard).join("")}</div>`;
}

function sponsorLine(): string {
  return `<p class="sponsor">Gehost en gesponsord door <strong>THISLINE</strong>. Voor wie naar voren stapt. Pulse, Front Line Cards en het platform zijn van THISLINE, geen verkochte advertenties.</p>`;
}

function gapCard(title: string, summary: string, slug: string): string {
  return `<div class="gap">
    <p class="eyebrow">Hier ontbreekt nog iets</p>
    <h2 class="h3">${escapeHtml(title)}</h2>
    <p>${escapeHtml(summary)} Weet jij daar wat van. Wil je dat toevoegen.</p>
    <a class="btn btn-secondary" href="/bijdragen?slug=${encodeURIComponent(slug)}&title=${encodeURIComponent(title)}">Schrijf dit op</a>
  </div>`;
}

export function layout(options: PageOptions, content: string): string {
  const pageTitle =
    options.title === config.siteName ? config.siteName : `${options.title} · ${config.siteName}`;
  const jsonLd = options.jsonLd ? JSON.stringify(options.jsonLd) : "";
  const noindex = options.path.startsWith("/beheer") || options.path === "/fout";
  const scripts = (options.scripts ?? []).map((src) => `<script src="${src}" defer></script>`).join("\n");
  const jsonBlock = options.jsonBlock
    ? `<script type="application/json" id="${escapeHtml(options.jsonBlock.id)}">${options.jsonBlock.json.replace(/</g, "\\u003c")}</script>`
    : "";

  return `<!doctype html>
<html lang="nl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(pageTitle)}</title>
    <meta name="description" content="${escapeHtml(options.description)}" />
    <meta name="theme-color" content="#000000" />
    <link rel="canonical" href="${escapeHtml(absoluteUrl(options.path))}" />
    <meta property="og:type" content="website" />
    <meta property="og:locale" content="nl_NL" />
    <meta property="og:site_name" content="THISLINE" />
    <meta property="og:title" content="${escapeHtml(pageTitle)}" />
    <meta property="og:description" content="${escapeHtml(options.description)}" />
    <meta property="og:url" content="${escapeHtml(absoluteUrl(options.path))}" />
    <meta name="robots" content="${noindex ? "noindex,nofollow" : "index,follow"}" />
    <link rel="preconnect" href="https://fonts.bunny.net" />
    <link href="https://fonts.bunny.net/css2?family=Inter:wght@300;400;500;600&amp;family=Roboto+Condensed:wght@400;700;900&amp;display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="/assets/thisline.css" />
    ${jsonLd ? `<script type="application/ld+json">${jsonLd}</script>` : ""}
    ${jsonBlock}
    ${scripts}
  </head>
  <body>
    <a class="skip" href="#inhoud">Naar inhoud</a>
    <header class="site-header">
      <div class="shell site-header-inner">
        <a class="wordmark" href="/">
          <span class="wordmark-name">THISLINE</span>
          <span class="wordmark-payoff">Voor wie naar voren stapt.</span>
          <span class="wordmark-product">UniformWiki</span>
        </a>
        <nav class="nav">
          ${navLink("/", "Overzicht", options.path)}
          ${navLink("/graaf", "Graaf", options.path)}
          ${navLink("/leemtes", "Leemtes", options.path)}
          ${navLink("/bijdragen", "Bijdragen", options.path)}
          ${navLink("/toegang", "Agents", options.path)}
          ${navLink("/privacy", "Privacy", options.path)}
        </nav>
      </div>
      <div class="tl-rule"></div>
    </header>
    <main id="inhoud" class="site-main">
      <div class="shell">${content}</div>
    </main>
    <footer class="site-footer">
      <div class="shell site-footer-inner">
        <p>Kennis voor en door mensen in uniform. Gehost door THISLINE.</p>
        <nav>
          <a href="/privacy">Privacy</a>
          <a href="/leemtes">Leemtes</a>
          <a href="https://thisline.eu" rel="noopener noreferrer">thisline.eu</a>
          <a href="/sitemap.xml">Sitemap</a>
        </nav>
      </div>
    </footer>
  </body>
</html>`;
}

export function homePage(
  categories: CategoryCount[],
  articles: ArticleRow[],
  query: string,
  notice?: string,
  gaps: ReturnType<typeof findGaps> = [],
): string {
  const empty = articles.length === 0;
  const kolomCards = KOLOMMEN.map(
    (kolom) => `
    <a class="card kolom-card" href="/dienst/${encodeURIComponent(kolom.id)}">
      <p class="eyebrow">${escapeHtml(kolom.label)}</p>
      <p>${escapeHtml(kolom.summary)}</p>
    </a>`,
  ).join("");
  const articleCards = articles
    .slice(0, 12)
    .map(
      (article) => `
      <article class="article-teaser">
        <span class="tag">${escapeHtml(article.dienst || article.category)}</span>
        <h2><a href="/wiki/${encodeURIComponent(article.slug)}">${escapeHtml(article.title)}</a></h2>
        <p>${escapeHtml(article.summary)}</p>
      </article>`,
    )
    .join("");
  const catChips = categories
    .map(
      (item) =>
        `<a class="chip" href="/?categorie=${encodeURIComponent(item.category)}">${escapeHtml(item.category)} (${item.count})</a>`,
    )
    .join("");

  return layout(
    {
      title: config.siteName,
      description: "Kennisbank voor brandweer, ambulance, politie, defensie en handhaving. Voor en door mensen in uniform.",
      path: "/",
    },
    `
    <section>
      <p class="eyebrow">Open kennisbank</p>
      <h1>Kennis voor wie naar voren stapt.</h1>
      <p class="lead">Kies eerst je kolom. Daarna het thema. Daarna het artikel. Hoe dieper je gaat, hoe gerichter de set. Geen medailles, geen scores. Statische indeling, gevuld door collega’s.</p>
    </section>
    <div class="kolom-grid">${kolomCards}</div>
    <form method="get" action="/" class="search">
      <label class="field" style="flex:1">
        <span class="field-label">Zoeken</span>
        <input class="input" id="q" name="q" value="${escapeHtml(query)}" placeholder="Zoek op titel, kolom, tag of bron" />
      </label>
      <button class="btn btn-primary" type="submit">Zoeken</button>
    </form>
    ${notice ? `<p class="ok">${escapeHtml(notice)}</p>` : ""}
    <div class="chips">${catChips}<a class="chip chip-lime" href="/graaf">Open de graaf</a><a class="chip" href="/leemtes">Wat nog ontbreekt</a></div>
    ${promoRow(query ? "search" : "home")}
    <section class="mt-8">
      <div class="row-between">
        <h2>${query ? `Resultaten voor “${escapeHtml(query)}”` : "Recent"}</h2>
        <a href="/bijdragen">Zelf iets toevoegen</a>
      </div>
      ${empty ? `<div class="empty">Niets gevonden. Probeer een kortere term of <a href="/bijdragen">schrijf de pagina</a>.</div>` : `<div class="article-list">${articleCards}</div>`}
    </section>
    ${gaps[0] ? gapCard(gaps[0].title, gaps[0].summary, gaps[0].slug) : ""}
    ${sponsorLine()}`,
  );
}

export function articlePage(
  article: ArticleRow,
  revisions: RevisionRow[],
  neighborhood: ArticleNeighborhood,
  allArticles: ArticleRow[],
): string {
  const metadata = parseStoredMetadata(article.metadata);
  const sources = sourceBlock(metadata.bronnen, metadata.ai);
  const resolve = buildLinkResolver(allArticles);
  const metaRows = Object.entries(metadata)
    .filter(([key, value]) => value && !["bronnen", "ai", "dienst", "diensten", "trefwoorden", "tags"].includes(key))
    .map(
      ([key, value]) => `<div><dt>${escapeHtml(key)}</dt><dd>${escapeHtml(value ?? "")}</dd></div>`,
    )
    .join("");
  const tags = neighborhood.tags
    .map((tag) => `<a class="chip chip-lime" href="/tag/${encodeURIComponent(tag.toLowerCase().replace(/\s+/g, "-"))}">${escapeHtml(tag)}</a>`)
    .join("");
  const diensten = neighborhood.diensten
    .map((dienst) => `<a class="chip" href="/dienst/${encodeURIComponent(dienst.toLowerCase())}">${escapeHtml(dienst)}</a>`)
    .join("");
  const related = neighborhood.related
    .map(
      (item: RelatedArticle) => `<li>
        <a href="/wiki/${encodeURIComponent(item.slug)}">${escapeHtml(item.title)}</a>
        <span>${escapeHtml(item.reasons.join(" · "))}</span>
      </li>`,
    )
    .join("");
  const backlinks = neighborhood.backlinks
    .map((item) => `<li><a href="/wiki/${encodeURIComponent(item.slug)}">${escapeHtml(item.title)}</a></li>`)
    .join("");
  const cites = sources.citations
    .map((item) => `<li>${escapeHtml(item.text)}</li>`)
    .join("");
  const changelog = revisions
    .map(
      (revision) => `<li>
        <span class="dot ${revision.status === "approved" ? "dot-on" : ""}"></span>
        <p>${escapeHtml(revision.title)}</p>
        <p class="meta">${escapeHtml(revision.created_at)} · ${escapeHtml(revision.contributor_name)} · ${escapeHtml(revision.status)}</p>
      </li>`,
    )
    .join("");
  const missing = neighborhood.missing[0];
  const dienst = neighborhood.diensten[0] ?? "";

  return layout(
    {
      title: article.title,
      description: article.summary,
      path: `/wiki/${article.slug}`,
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: article.title,
        description: article.summary,
        articleSection: article.category,
        dateModified: article.updated_at,
        datePublished: article.created_at,
        author: { "@type": "Organization", name: "THISLINE" },
        publisher: { "@type": "Organization", name: "THISLINE", url: "https://thisline.eu" },
      },
    },
    `
    <article class="wiki-layout">
      <div>
        <p class="eyebrow">${escapeHtml(article.category)}${dienst ? ` · ${escapeHtml(dienst)}` : ""}</p>
        <h1>${escapeHtml(article.title)}</h1>
        <p class="lead">${escapeHtml(article.summary)}</p>
        <div class="chips">${diensten}${tags}<a class="chip" href="/graaf?focus=${encodeURIComponent(article.slug)}">Toon in de graaf</a></div>
        <div class="prose mt-6">${renderMarkdown(article.body, resolve)}</div>
        <section class="cite ${sources.missingSources ? "is-missing" : ""}">
          <h2>Bronnen</h2>
          ${
            cites
              ? `<ol>${cites}</ol>`
              : `<p class="hint">Er staan nog geen bronnen bij dit stuk. Weet jij waar dit vandaan komt. <a href="/bijdragen?slug=${encodeURIComponent(article.slug)}">Voeg de bronvermelding toe</a>.</p>`
          }
          <p class="ai-note ${sources.missingAi ? "is-missing" : ""}">${escapeHtml(aiLabel(sources.ai))}</p>
        </section>
        ${missing ? gapCard(missing, "Deze pagina verwijst ernaar, maar het artikel bestaat nog niet.", missing) : ""}
        ${promoRow("article", dienst)}
        ${sponsorLine()}
      </div>
      <aside class="stack">
        <section class="card">
          <h2 class="h3">Hoort bij</h2>
          <ul class="rel-list">${related || `<li class="meta">Nog geen gerichte buren. Voeg een tag, kolom of [[verwijzing]] toe.</li>`}</ul>
        </section>
        <section class="card">
          <h2 class="h3">Vermeld op</h2>
          <ul class="rel-list">${backlinks || `<li class="meta">Nog geen terugverwijzingen.</li>`}</ul>
        </section>
        <section class="card">
          <h2 class="h3">Metadata</h2>
          <dl class="meta-list">${metaRows || `<p class="meta">Geen extra velden.</p>`}</dl>
        </section>
        <section class="card">
          <h2 class="h3">Geschiedenis</h2>
          <ol class="timeline">${changelog || `<li class="meta">Nog geen revisies.</li>`}</ol>
          <p class="meta mt-4"><a href="/bijdragen?slug=${encodeURIComponent(article.slug)}">Stuur een nieuwe versie in</a></p>
        </section>
      </aside>
    </article>`,
  );
}

export function notFoundPage(message = "Dit artikel is er niet, of het wacht nog op goedkeuring."): string {
  return layout(
    { title: "Niet gevonden", description: message, path: "/404" },
    `<section><h1>Pagina niet gevonden</h1><p class="lead">${escapeHtml(message)}</p><p class="mt-5"><a href="/">Terug naar het overzicht</a></p></section>`,
  );
}

export function errorPage(message: string): string {
  return layout(
    { title: "Er ging iets mis", description: message, path: "/fout" },
    `<section><h1>Er ging iets mis</h1><p class="lead">${escapeHtml(message)}</p><p class="mt-5"><a href="/">Terug naar het overzicht</a></p></section>`,
  );
}

export function contributePage(values: {
  title?: string;
  slug?: string;
  category?: string;
  dienst?: string;
  summary?: string;
  body?: string;
  tags?: string;
  bronnen?: string;
  aiOrigin?: string;
  name?: string;
  note?: string;
  notice?: string;
  error?: string;
}): string {
  const diensten = ["", "Brandweer", "Ambulance", "Politie", "Defensie", "Handhaving"]
    .map((item) => {
      const selected = (values.dienst ?? "") === item ? " selected" : "";
      return `<option value="${escapeHtml(item)}"${selected}>${item || "Kies een kolom"}</option>`;
    })
    .join("");
  const ai = values.aiOrigin ?? "";
  return layout(
    {
      title: "Bijdragen",
      description: "Stuur een artikel in. Bronnen en AI-herkomst zijn verplicht.",
      path: "/bijdragen",
    },
    `
    <section class="stack" style="max-width:42rem">
      <p class="eyebrow">Voor en door de kolommen</p>
      <h1>Schrijf mee</h1>
      <p class="lead">Geen account. Een beheerder leest na. Bronnen zet je in de stijl: organisatie of auteur, jaar, titel, URL. Zeg altijd of AI is gebruikt.</p>
      ${values.notice ? `<p class="ok">${escapeHtml(values.notice)}</p>` : ""}
      ${values.error ? `<p class="error">${escapeHtml(values.error)}</p>` : ""}
      <form method="post" action="/bijdragen" class="card stack">
        <label class="field"><span class="field-label">Titel</span><input class="input" name="title" required maxlength="180" value="${escapeHtml(values.title ?? "")}" /></label>
        <label class="field"><span class="field-label">Kolom</span><select class="input" name="dienst" required>${diensten}</select></label>
        <label class="field"><span class="field-label">Categorie</span><input class="input" name="category" required maxlength="80" value="${escapeHtml(values.category ?? "")}" placeholder="Bijvoorbeeld Uitrusting" /></label>
        <label class="field"><span class="field-label">Tags</span><input class="input" name="tags" value="${escapeHtml(values.tags ?? "")}" placeholder="kommagescheiden, zoals hesje, EN ISO 20471" /></label>
        <label class="field"><span class="field-label">Slug (leeg = nieuw, of de bestaande slug om te verbeteren)</span><input class="input" name="slug" value="${escapeHtml(values.slug ?? "")}" /></label>
        <label class="field"><span class="field-label">Korte samenvatting</span><textarea class="textarea" name="summary" rows="2">${escapeHtml(values.summary ?? "")}</textarea></label>
        <label class="field"><span class="field-label">Tekst</span>
          <textarea class="textarea" name="body" required rows="14">${escapeHtml(values.body ?? "Koppel met [[Naam van artikel]].\n")}</textarea>
          <span class="hint">Verwijs met [[titel]]. Ontbrekende links worden een verzoek aan de volgende collega.</span>
        </label>
        <label class="field"><span class="field-label">Bronnen, één per regel</span>
          <textarea class="textarea" name="bronnen" required rows="4" placeholder="NEN. (2013). NEN-EN-ISO 20471:2013 High visibility clothing.">${escapeHtml(values.bronnen ?? "")}</textarea>
          <span class="hint">Organisatie of auteur. (Jaar). Titel. Uitgever of URL.</span>
        </label>
        <fieldset class="field">
          <legend class="field-label">Herkomst van de tekst</legend>
          <div class="radio-row">
            <label><input type="radio" name="ai_origin" value="mens" ${ai === "mens" ? "checked" : ""} required /> Door een mens geschreven, zonder generatieve AI voor de inhoud</label>
            <label><input type="radio" name="ai_origin" value="ai-ondersteund" ${ai === "ai-ondersteund" ? "checked" : ""} /> Met AI-ondersteuning, nagekeken door een mens</label>
            <label><input type="radio" name="ai_origin" value="ai-gegenereerd" ${ai === "ai-gegenereerd" ? "checked" : ""} /> Met AI opgesteld, nagekeken voordat het live mag</label>
          </div>
        </fieldset>
        <label class="field"><span class="field-label">Jouw naam of initialen (optioneel)</span><input class="input" name="contributor_name" value="${escapeHtml(values.name ?? "")}" /></label>
        <label class="field"><span class="field-label">Toelichting voor de beheerder</span><input class="input" name="contributor_note" value="${escapeHtml(values.note ?? "")}" /></label>
        <button class="btn btn-primary" type="submit">Insturen ter beoordeling</button>
      </form>
    </section>`,
  );
}

export function accessPage(): string {
  return layout(
    {
      title: "Toegang voor agents",
      description: "MCP- en API-toegang tot UniformWiki.",
      path: "/toegang",
    },
    `<section style="max-width:42rem">
      <h1>Toegang voor AI-agents</h1>
      <p class="lead">Mensen lezen de wiki in Europa gratis. Agents die programmatisch ophalen, doen dat met een licentiesleutel uit FluentCart.</p>
      <ol class="steps">
        <li>Licentie in de webshop.</li>
        <li>FluentCart stuurt een webhook.</li>
        <li>Er ontstaat een sleutel <code class="k">uw_live_…</code>.</li>
      </ol>
      <div class="card mt-6">
        <p><strong>MCP</strong> — <code class="k">POST ${escapeHtml(config.publicBaseUrl)}/api/v1/mcp</code></p>
        <p class="mt-3"><strong>Header</strong> — <code class="k">Authorization: Bearer uw_live_…</code></p>
        <p class="mt-3">Tools: <code class="k">get_uniform_article</code>, <code class="k">search_uniform_articles</code>, <code class="k">get_related_articles</code>.</p>
      </div>
    </section>`,
  );
}

export function privacyPage(): string {
  return layout(
    {
      title: "Privacy",
      description: "Geen tracking, geen Google Fonts, geen verkoop van gegevens.",
      path: "/privacy",
    },
    `<section class="privacy" style="max-width:42rem">
      <p class="eyebrow">Privacy first</p>
      <h1>Wat we wel en niet doen</h1>
      <p class="lead">UniformWiki is gemaakt om kennis te delen, niet om mensen te volgen. We slaan geen accounts van lezers op. Lettertypes komen van Bunny Fonts, niet van Google.</p>
      <h2>Lezen</h2>
      <p>Bezoeken worden niet van een naam voorzien. We zetten geen analytics, geen pixels en geen advertentienetwerken van derden. De blokken voor Pulse, Front Line Cards en het platform zijn van THISLINE zelf.</p>
      <h2>Bijdragen</h2>
      <p>Een naam is optioneel en blijft alleen bij de revisie. BSN, e-mailadressen en Nederlandse telefoonnummers worden uit de tekst gehaald voordat iets wordt opgeslagen.</p>
      <h2>Beheer</h2>
      <p>Er is één HttpOnly-cookie, alleen op /beheer, alleen als je als beheerder inlogt.</p>
      <h2>Licenties</h2>
      <p>E-mail van webshopklanten staat bij de MCP-sleutel, omdat de licentie anders niet te koppelen is. Dat is geen mailinglijst.</p>
      <h2>Europa</h2>
      <p>De wiki draait in Europa en is bedoeld voor bezoek uit Europa. Buiten Europa laten we het verkeer bewust buiten, zodat de hosting klein en betaalbaar blijft.</p>
      <p class="meta mt-6">Vragen: <a href="mailto:martijn@thisline.eu">martijn@thisline.eu</a></p>
    </section>`,
  );
}

export function graphPage(payload: { nodes: unknown[]; edges: unknown[] }, focus = ""): string {
  return layout(
    {
      title: "Kennisgraaf",
      description: "Zie in één beeld wat bij een thema, tag of kolom hoort.",
      path: "/graaf",
      scripts: ["/assets/graph.js"],
      jsonBlock: { id: "graph-data", json: JSON.stringify({ ...payload, focus }) },
    },
    `
    <section>
      <p class="eyebrow">Netwerk</p>
      <h1>Wat hoort bij dit thema.</h1>
      <p class="lead">Artikelen, kolommen, tags en [[verwijzingen]]. Sleep, zoom, klik. Geen speeltuin. Statische relaties uit de teksten zelf.</p>
      <div class="chips">
        <a class="chip ${!focus ? "chip-lime" : ""}" href="/graaf">Alles</a>
        ${KOLOMMEN.map((kolom) => `<a class="chip" href="/dienst/${kolom.id}">${escapeHtml(kolom.label)}</a>`).join("")}
      </div>
      <div class="graph-legend"><span>Wit · artikel</span><span>Lime · tag</span><span>Ring · kolom</span><span>Grijs · categorie</span></div>
      <p id="graaf-leeg" class="empty" hidden>Nog te weinig koppelingen voor een graaf. Voeg [[verwijzingen]] en tags toe.</p>
      <div class="graph-wrap"><canvas id="graaf" width="1100" height="520" aria-label="Kennisgraaf"></canvas></div>
    </section>
    ${promoRow("graaf")}
    ${sponsorLine()}`,
  );
}

export function dienstPage(
  label: string,
  summary: string,
  articles: ArticleRow[],
  gaps: ReturnType<typeof findGaps>,
  themes: Array<{ slug: string; title: string; summary: string }>,
): string {
  const list = articles
    .map(
      (article) => `<article class="article-teaser">
        <h2><a href="/wiki/${encodeURIComponent(article.slug)}">${escapeHtml(article.title)}</a></h2>
        <p>${escapeHtml(article.summary)}</p>
      </article>`,
    )
    .join("");
  const themeChips = themes
    .map((theme) => `<a class="chip" href="/bijdragen?slug=${encodeURIComponent(theme.slug)}&title=${encodeURIComponent(theme.title)}">${escapeHtml(theme.title)}</a>`)
    .join("");
  return layout(
    {
      title: label,
      description: summary,
      path: `/dienst/${label.toLowerCase()}`,
    },
    `
    <section>
      <p class="eyebrow">Kolom</p>
      <h1>${escapeHtml(label)}</h1>
      <p class="lead">${escapeHtml(summary)} De thema’s hieronder zijn vast. Artikelen vullen ze. Wat leeg is, mag jij schrijven.</p>
      <div class="chips">${themeChips}<a class="chip chip-lime" href="/graaf">Graaf</a></div>
    </section>
    <section class="mt-8">${list || `<div class="empty">Nog geen goedgekeurde stukken in deze kolom.</div>`}</section>
    ${gaps.slice(0, 3).map((gap) => gapCard(gap.title, gap.summary, gap.slug)).join("")}
    ${promoRow("article", label)}
    ${sponsorLine()}`,
  );
}

export function tagPage(tag: string, articles: ArticleRow[]): string {
  const list = articles
    .map(
      (article) => `<article class="article-teaser">
        <h2><a href="/wiki/${encodeURIComponent(article.slug)}">${escapeHtml(article.title)}</a></h2>
        <p>${escapeHtml(article.summary)}</p>
      </article>`,
    )
    .join("");
  return layout(
    { title: `Tag: ${tag}`, description: `Artikelen met tag ${tag}.`, path: `/tag/${tag}` },
    `<section><p class="eyebrow">Tag</p><h1>${escapeHtml(tag)}</h1>
    <div class="mt-6">${list || `<div class="empty">Nog niets met deze tag.</div>`}</div></section>`,
  );
}

export function gapsPage(gaps: ReturnType<typeof findGaps>): string {
  const items = gaps
    .slice(0, 40)
    .map((gap) => gapCard(`${gap.kolom}: ${gap.title}`, gap.summary, gap.slug))
    .join("");
  return layout(
    {
      title: "Leemtes",
      description: "Thema’s en verwijzingen die nog een artikel missen.",
      path: "/leemtes",
    },
    `<section>
      <p class="eyebrow">Vullen jullie</p>
      <h1>Hier ontbreekt nog iets.</h1>
      <p class="lead">De kolommen en thema’s liggen vast. De stukken komen van mensen in uniform. Weet jij er wat van, schrijf het op, met bron.</p>
    </section>
    ${items || `<div class="empty">Geen open leemtes. Dat is zeldzaam. Controleer de graaf.</div>`}
    ${promoRow("gap")}
    ${sponsorLine()}`,
  );
}

export function adminLoginPage(error?: string): string {
  return layout(
    { title: "Beheer", description: "Aanmelden voor moderatie.", path: "/beheer" },
    `<section style="max-width:28rem">
      <h1>Beheer</h1>
      <p class="lead">Plak de beheersleutel uit ADMIN_API_KEY.</p>
      ${error ? `<p class="error">${escapeHtml(error)}</p>` : ""}
      <form method="post" action="/beheer/login" class="card stack mt-5">
        <label class="field"><span class="field-label">Beheersleutel</span><input class="input" type="password" name="key" required /></label>
        <button class="btn btn-primary" type="submit">Open beheer</button>
      </form>
    </section>`,
  );
}

function statusBadge(status: string): string {
  const map: Record<string, string> = {
    pending: "badge-wait",
    approved: "badge-ok",
    rejected: "badge-off",
    active: "badge-ok",
    suspended: "badge-danger",
    revoked: "badge-off",
    admin: "badge-lime",
    mcp: "badge-wait",
    public_read: "badge-off",
  };
  return `<span class="badge ${map[status] ?? "badge-off"}">${escapeHtml(status)}</span>`;
}

export function adminDashboard(input: {
  pending: Array<RevisionRow & { slug: string }>;
  articles: ArticleRow[];
  keys: ApiKeyRow[];
  notice?: string;
}): string {
  const pendingRows = input.pending
    .map(
      (item) => `<article class="card">
        <p class="eyebrow">${escapeHtml(item.category)} · ${escapeHtml(item.slug)}</p>
        <h3 class="h3">${escapeHtml(item.title)}</h3>
        <p class="meta">${escapeHtml(item.contributor_name)} · ${escapeHtml(item.created_at)}</p>
        <p class="mt-3">${escapeHtml(item.summary)}</p>
        <div class="row mt-4">
          <form method="post" action="/beheer/beslissing">
            <input type="hidden" name="revision_id" value="${item.id}" />
            <input type="hidden" name="decision" value="approved" />
            <button class="btn btn-primary btn-sm" type="submit">Goedkeuren</button>
          </form>
          <form method="post" action="/beheer/beslissing">
            <input type="hidden" name="revision_id" value="${item.id}" />
            <input type="hidden" name="decision" value="rejected" />
            <button class="btn btn-danger btn-sm" type="submit">Afwijzen</button>
          </form>
        </div>
        <details class="mt-4"><summary>Tekst bekijken</summary><div class="prose mt-3">${renderMarkdown(item.body)}</div></details>
      </article>`,
    )
    .join("");
  const articleRows = input.articles
    .map(
      (article) => `<tr>
        <td><a href="/wiki/${encodeURIComponent(article.slug)}">${escapeHtml(article.title)}</a></td>
        <td>${escapeHtml(article.dienst || article.category)}</td>
        <td>${statusBadge(article.status)}</td>
        <td>${escapeHtml(article.updated_at)}</td>
      </tr>`,
    )
    .join("");
  const keyRows = input.keys
    .map(
      (key) => `<tr>
        <td><code class="k">${escapeHtml(key.key)}</code></td>
        <td>${statusBadge(key.tier)}</td>
        <td>${statusBadge(key.status)}</td>
        <td>${escapeHtml(key.customer_email ?? "—")}</td>
      </tr>`,
    )
    .join("");

  return layout(
    { title: "Beheer", description: "Moderatie en licenties.", path: "/beheer" },
    `
    <div class="row-between">
      <div><h1>Beheer</h1><p class="lead">Keur bijdragen, check bronnen en AI-herkomst, exporteer een backup.</p></div>
      <div class="row">
        <a class="btn btn-secondary" href="/beheer/export.json">JSON-export</a>
        <form method="post" action="/beheer/logout"><button class="btn btn-ghost" type="submit">Uitloggen</button></form>
      </div>
    </div>
    ${input.notice ? `<p class="ok">${escapeHtml(input.notice)}</p>` : ""}
    <section class="mt-8"><h2>Wachtend op keuring</h2><div class="stack mt-4">${pendingRows || `<p class="empty">Geen openstaande bijdragen.</p>`}</div></section>
    <section class="mt-8">
      <h2>Direct publiceren</h2>
      <form method="post" action="/beheer/artikel" class="card grid-2 mt-4">
        <label class="field span-2"><span class="field-label">Titel</span><input class="input" name="title" required /></label>
        <label class="field"><span class="field-label">Kolom</span><input class="input" name="dienst" placeholder="Brandweer" /></label>
        <label class="field"><span class="field-label">Categorie</span><input class="input" name="category" required /></label>
        <label class="field span-2"><span class="field-label">Tags</span><input class="input" name="tags" /></label>
        <label class="field span-2"><span class="field-label">Bronnen</span><textarea class="textarea" name="bronnen" required rows="3"></textarea></label>
        <label class="field span-2"><span class="field-label">AI-herkomst</span>
          <select class="input" name="ai_origin" required>
            <option value="mens">Mens</option>
            <option value="ai-ondersteund">AI-ondersteund</option>
            <option value="ai-gegenereerd">AI-gegenereerd</option>
          </select>
        </label>
        <label class="field span-2"><span class="field-label">Tekst</span><textarea class="textarea" name="body" required rows="8"></textarea></label>
        <button class="btn btn-primary span-2" type="submit">Publiceren</button>
      </form>
    </section>
    <section class="mt-8 overflow"><h2>Artikelen</h2>
      <table class="data mt-4"><thead><tr><th>Titel</th><th>Kolom</th><th>Status</th><th>Gewijzigd</th></tr></thead>
      <tbody>${articleRows || `<tr><td colspan="4">Nog geen artikelen.</td></tr>`}</tbody></table>
    </section>
    <section class="mt-8 overflow"><h2>Licentiesleutels</h2>
      <table class="data mt-4"><thead><tr><th>Sleutel</th><th>Tier</th><th>Status</th><th>E-mail</th></tr></thead>
      <tbody>${keyRows || `<tr><td colspan="4">Nog geen sleutels.</td></tr>`}</tbody></table>
    </section>`,
  );
}
