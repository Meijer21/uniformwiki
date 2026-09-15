import { config } from "../config.js";
import { aiLabel, parseCitations, sourceBlock, type Citation } from "../lib/citations.js";
import { assetUrl } from "../lib/assets.js";
import { articleMatchesTheme, findGaps } from "../lib/gaps.js";
import type { ArticleNeighborhood, GraphPayload, RelatedArticle } from "../lib/graph.js";
import { articleDiensten, articleTags, buildLinkResolver } from "../lib/links.js";
import { escapeHtml, renderMarkdown } from "../lib/markdown.js";
import { parseStoredMetadata } from "../lib/metadata.js";
import { promosFor, type Promo, type PromoPlacement } from "../lib/promos.js";
import { articleJsonLd, breadcrumbJsonLd, organizationJsonLd } from "../lib/seo.js";
import { slugify } from "../lib/slug.js";
import { KOLOMMEN, type Thema } from "../lib/taxonomy.js";
import type { PublicColumn } from "../lib/columns.js";
import type { ApiKeyRow, ArticleRow, RevisionRow, VocabRow } from "../types.js";

export interface PageOptions {
  title: string;
  description: string;
  path: string;
  jsonLd?: Record<string, unknown>;
  scripts?: string[];
  jsonBlock?: { id: string; json: string };
  markdownUrl?: string;
}

export interface ContributeValues {
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
  locked?: boolean;
  categoryNew?: string;
  dienstNew?: string;
  modus?: "aanpassen" | "aanvullen" | "nieuw";
}

export interface ContributeOptions {
  categories: string[];
  tags: string[];
  diensten: string[];
  mentions: Array<{ kind: string; label: string; insert: string }>;
}

function absoluteUrl(path: string): string {
  return `${config.publicBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

function navLink(href: string, label: string, current: string): string {
  const aliases: Record<string, string[]> = {
    "/kennisweb": ["/graaf", "/samenhang"],
    "/aanvullen": ["/leemtes"],
  };
  const extra = aliases[href] ?? [];
  const active =
    current === href ||
    extra.includes(current) ||
    (href !== "/" && (current.startsWith(href) || extra.some((item) => current.startsWith(item))));
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
  const promo = promosFor(placement, dienst)[0];
  if (!promo) {
    return "";
  }
  return `<div class="promo-row">${promoCard(promo)}</div>`;
}

function sponsorLine(): string {
  return `<p class="sponsor">Gehost door <strong>THISLINE</strong>. Voor wie naar voren stapt.</p>`;
}

function stukkenLabel(count: number): string {
  if (count === 0) {
    return "Nog leeg";
  }
  return count === 1 ? "1 stuk" : `${count} stukken`;
}

function crumbs(items: Array<{ href?: string; label: string }>): string {
  return `<nav aria-label="Pad"><ol class="crumbs">${items
    .map((item, index) => {
      const last = index === items.length - 1;
      const node =
        item.href && !last
          ? `<a href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a>`
          : `<span${last ? ' aria-current="page"' : ""}>${escapeHtml(item.label)}</span>`;
      return `<li>${node}</li>`;
    })
    .join("")}</ol></nav>`;
}

function pickList(rows: string, label: string): string {
  return `<ul class="pick-list" aria-label="${escapeHtml(label)}">${rows}</ul>`;
}

function chooseRow(href: string, title: string, text: string, meta: string): string {
  return `<li><a class="pick-item" href="${escapeHtml(href)}">
    <span class="pick-main">
      <span class="pick-title">${escapeHtml(title)}</span>
      <span class="pick-sub">${escapeHtml(text)}</span>
    </span>
    <span class="pick-meta">${escapeHtml(meta)}</span>
    <span class="pick-go" aria-hidden="true">›</span>
  </a></li>`;
}

function articleTeaser(article: ArticleRow): string {
  const dienst = articleDiensten(article)[0];
  const dienstLink = dienst
    ? `<a class="tag" href="/dienst/${encodeURIComponent(slugify(dienst))}">${escapeHtml(dienst)}</a>`
    : `<a class="tag" href="/tag/${encodeURIComponent(slugify(article.category))}">${escapeHtml(article.category)}</a>`;
  return `<article class="article-teaser">
    ${dienstLink}
    <h2><a href="/wiki/${encodeURIComponent(article.slug)}">${escapeHtml(article.title)}</a></h2>
    <p>${escapeHtml(article.summary)}</p>
  </article>`;
}

function searchForm(query: string, label = "Of zoek een artikel"): string {
  return `<form method="get" action="/" class="search-quiet" role="search">
    <label class="field">
      <span class="field-label">${escapeHtml(label)}</span>
      <input class="input" type="search" id="q" name="q" value="${escapeHtml(query)}" placeholder="Titel of bron" enterkeyhint="search" />
    </label>
    <button class="btn btn-primary" type="submit">Zoeken</button>
  </form>`;
}

function gapCard(title: string, summary: string, slug: string): string {
  return `<div class="gap">
    <p class="eyebrow">Nog open</p>
    <h2 class="h3">${escapeHtml(title)}</h2>
    <p>${escapeHtml(summary)} Ken je dit. Vul het aan.</p>
    <a class="btn btn-secondary" href="/bijdragen?slug=${encodeURIComponent(slug)}&title=${encodeURIComponent(title)}&vast=1">Aanvullen</a>
  </div>`;
}

function citationItem(item: Citation): string {
  if (item.url) {
    return `<li><a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.name)}</a></li>`;
  }
  return `<li>${escapeHtml(item.name)}</li>`;
}

export function layout(options: PageOptions, content: string): string {
  const pageTitle =
    options.title === config.siteName ? config.siteName : `${options.title} · ${config.siteName}`;
  const jsonLd = options.jsonLd ? JSON.stringify(options.jsonLd) : "";
  const noindex = options.path.startsWith("/beheer") || options.path === "/fout";
  const scripts = (options.scripts ?? [])
    .map((src) => `<script src="${escapeHtml(assetUrl(src))}" defer></script>`)
    .join("\n");
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
    <meta name="theme-color" content="#202124" />
    <link rel="canonical" href="${escapeHtml(absoluteUrl(options.path))}" />
    <meta property="og:type" content="website" />
    <meta property="og:locale" content="nl_NL" />
    <meta property="og:site_name" content="THISLINE" />
    <meta property="og:title" content="${escapeHtml(pageTitle)}" />
    <meta property="og:description" content="${escapeHtml(options.description)}" />
    <meta property="og:url" content="${escapeHtml(absoluteUrl(options.path))}" />
    <meta name="robots" content="${noindex ? "noindex,nofollow" : "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"}" />
    <meta name="googlebot" content="${noindex ? "noindex,nofollow" : "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"}" />
    <link rel="sitemap" type="application/xml" title="Sitemap" href="${escapeHtml(absoluteUrl("/sitemap.xml"))}" />
    <link rel="alternate" type="application/rss+xml" title="UniformWiki" href="${escapeHtml(absoluteUrl("/feed.xml"))}" />
    <link rel="alternate" type="text/plain" title="llms.txt" href="${escapeHtml(absoluteUrl("/llms.txt"))}" />
    ${options.markdownUrl ? `<link rel="alternate" type="text/markdown" title="Markdown" href="${escapeHtml(absoluteUrl(options.markdownUrl))}" />` : ""}
    <link rel="preconnect" href="https://fonts.bunny.net" />
    <link href="https://fonts.bunny.net/css2?family=Inter:wght@300;400;500;600&amp;family=Roboto+Condensed:wght@400;700;900&amp;display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="${escapeHtml(assetUrl("/assets/thisline.css"))}" />
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
        <nav class="nav" aria-label="Hoofd">
          ${navLink("/", "Start", options.path)}
          ${navLink("/bijdragen", "Schrijven", options.path)}
          ${navLink("/kennisweb", "Samenhang", options.path)}
        </nav>
        <form class="header-search" method="get" action="/" role="search">
          <label class="skip" for="q-top">Zoeken</label>
          <input class="input" id="q-top" type="search" name="q" placeholder="Zoeken" enterkeyhint="search" />
          <button class="btn btn-primary btn-sm" type="submit">Zoek</button>
        </form>
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
          <a href="/aanvullen">Aanvullen</a>
          <a href="/kennisweb">KennisWeb</a>
          <a href="/toegang">Agents</a>
          <a href="https://thisline.eu" rel="noopener noreferrer">thisline.eu</a>
        </nav>
      </div>
    </footer>
  </body>
</html>`;
}

export function homePage(
  columns: PublicColumn[],
  articles: ArticleRow[],
  query: string,
  notice?: string,
): string {
  const searching = query.trim().length > 0;
  const results = searching ? articles : [];
  const empty = searching && results.length === 0;
  const kolomRows = columns
    .map((kolom) => {
      const count = articles.filter((article) =>
        articleDiensten(article).some((dienst) => dienst.toLowerCase() === kolom.label.toLowerCase()),
      ).length;
      return chooseRow(`/dienst/${encodeURIComponent(kolom.id)}`, kolom.label, kolom.summary, stukkenLabel(count));
    })
    .join("");
  const resultList = results.map(articleTeaser).join("");

  if (searching) {
    return layout(
      {
        title: `Zoeken: ${query}`,
        description: `Zoekresultaten in UniformWiki voor ${query}.`,
        path: "/",
      },
      `
    <div class="home-start">
      ${crumbs([{ href: "/", label: "Start" }, { label: "Zoeken" }])}
      <section>
        <h1>Resultaten</h1>
        <p class="lead">Voor “${escapeHtml(query)}”.</p>
      </section>
      ${notice ? `<p class="ok">${escapeHtml(notice)}</p>` : ""}
      ${searchForm(query, "Zoeken")}
      <section class="mt-6" aria-live="polite">
        ${empty ? `<div class="empty">Niets gevonden. Kies een dienst of <a href="/bijdragen">schrijf de pagina</a>.</div>` : `<div class="article-list">${resultList}</div>`}
      </section>
    </div>
    ${sponsorLine()}`,
    );
  }

  return layout(
    {
      title: config.siteName,
      description: "Kies eerst een dienst. Daarna een thema, daarna het artikel.",
      path: "/",
      jsonLd: organizationJsonLd(),
    },
    `
    <div class="home-start">
      <section>
        <p class="eyebrow">UniformWiki</p>
        <h1>Welke dienst?</h1>
        <p class="lead">Eén keuze. Daarna volgt het thema. Daarna het artikel.</p>
      </section>
      ${notice ? `<p class="ok">${escapeHtml(notice)}</p>` : ""}
      ${pickList(kolomRows, "Diensten")}
      ${searchForm("")}
    </div>
    ${sponsorLine()}`,
  );
}

export function articlePage(
  article: ArticleRow,
  revisions: RevisionRow[],
  neighborhood: ArticleNeighborhood,
  allArticles: ArticleRow[],
  graph: GraphPayload,
  notice?: string,
): string {
  const metadata = parseStoredMetadata(article.metadata);
  const sources = sourceBlock(metadata.bronnen, metadata.ai);
  const resolve = buildLinkResolver(allArticles);
  const tags = neighborhood.tags
    .map((tag) => `<a class="chip" href="/tag/${encodeURIComponent(slugify(tag))}">${escapeHtml(tag)}</a>`)
    .join("");
  const diensten = neighborhood.diensten
    .map((dienst) => `<a class="chip" href="/dienst/${encodeURIComponent(slugify(dienst))}">${escapeHtml(dienst)}</a>`)
    .join("");
  const related = neighborhood.related
    .map(
      (item: RelatedArticle) => `<li>
        <a href="/wiki/${encodeURIComponent(item.slug)}">${escapeHtml(item.title)}</a>
      </li>`,
    )
    .join("");
  const backlinks = neighborhood.backlinks
    .map((item) => `<li><a href="/wiki/${encodeURIComponent(item.slug)}">${escapeHtml(item.title)}</a></li>`)
    .join("");
  const cites = sources.citations.map(citationItem).join("");
  const changelog = revisions
    .map(
      (revision) => `<li>
        <span class="dot ${revision.status === "approved" ? "dot-on" : ""}"></span>
        <p>${escapeHtml(revision.title)}</p>
        <p class="meta">${escapeHtml(revision.created_at)} · ${escapeHtml(revision.contributor_name)}</p>
      </li>`,
    )
    .join("");
  const missing = neighborhood.missing[0];
  const dienst = neighborhood.diensten[0] ?? "";
  const koppelOptions = allArticles
    .filter((item) => item.slug !== article.slug)
    .map((item) => `<option value="${escapeHtml(item.slug)}">${escapeHtml(item.title)}</option>`)
    .join("");

  return layout(
    {
      title: article.title,
      description: article.summary,
      path: `/wiki/${article.slug}`,
      markdownUrl: `/wiki/${article.slug}.md`,
      scripts: ["/assets/graph.js"],
      jsonBlock: { id: "graph-data", json: JSON.stringify({ ...graph, focus: article.slug }) },
      jsonLd: articleJsonLd(article, sources.citations),
    },
    `
    <article class="wiki-layout">
      <div>
        ${notice ? `<p class="ok">${escapeHtml(notice)}</p>` : ""}
        <p class="eyebrow">${escapeHtml(article.category)}${dienst ? ` · ${escapeHtml(dienst)}` : ""}</p>
        <h1>${escapeHtml(article.title)}</h1>
        <p class="lead">${escapeHtml(article.summary)}</p>
        <div class="article-actions">
          <a class="btn btn-primary btn-sm" href="/bijdragen?slug=${encodeURIComponent(article.slug)}&modus=aanpassen&vast=1">Aanpassen</a>
          <a class="btn btn-secondary btn-sm" href="/bijdragen?slug=${encodeURIComponent(article.slug)}&modus=aanvullen&vast=1">Aanvullen</a>
        </div>
        <div class="chips">${diensten}${tags}</div>
        <div class="prose mt-6">${renderMarkdown(article.body, resolve)}</div>
        <section class="cite ${sources.missingSources ? "is-missing" : ""}">
          <h2>Bronnen</h2>
          ${
            cites
              ? `<ol>${cites}</ol>`
              : `<p class="hint">Er staan nog geen bronnen bij dit stuk. Weet jij waar dit vandaan komt. <a href="/bijdragen?slug=${encodeURIComponent(article.slug)}&modus=aanpassen&vast=1">Voeg de bron toe</a>.</p>`
          }
          <p class="ai-note ${sources.missingAi ? "is-missing" : ""}">${escapeHtml(aiLabel(sources.ai))}</p>
        </section>
        <section class="kennisweb-block">
          <details>
            <summary>Samenhang bekijken</summary>
            <p class="hint mt-3">Koppel zelf een artikel. De koppeling gaat eerst langs keuring.</p>
            <p id="kennisweb-leeg" class="empty" hidden>Nog te weinig koppelingen voor dit stuk.</p>
            <div class="graph-wrap graph-wrap-article"><canvas id="kennisweb" width="1100" height="360" aria-label="Samenhang"></canvas></div>
          </details>
          <form method="post" action="/wiki/${encodeURIComponent(article.slug)}/koppel" class="koppel-form">
            <label class="field" style="flex:1">
              <span class="field-label">Koppel een artikel</span>
              <select class="input" name="target" required>
                <option value="">Kies een artikel</option>
                ${koppelOptions}
              </select>
            </label>
            <button class="btn btn-secondary" type="submit">Koppelen</button>
          </form>
        </section>
        ${missing ? gapCard(missing, "Deze pagina verwijst ernaar, maar het artikel bestaat nog niet.", missing) : ""}
        ${promoRow("article", dienst)}
        ${sponsorLine()}
      </div>
      <aside class="stack wiki-side">
        <section>
          <h2 class="h3">Hoort bij</h2>
          <ul class="rel-list">${related || `<li class="meta">Nog geen gerichte buren.</li>`}</ul>
        </section>
        ${
          backlinks
            ? `<section>
          <h2 class="h3">Vermeld op</h2>
          <ul class="rel-list">${backlinks}</ul>
        </section>`
            : ""
        }
        <details>
          <summary>Geschiedenis</summary>
          <ol class="timeline mt-3">${changelog || `<li class="meta">Nog geen revisies.</li>`}</ol>
        </details>
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

export function contributePage(values: ContributeValues, options: ContributeOptions): string {
  const locked = Boolean(values.locked);
  const selectedTags = (values.tags ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const tagButtons = options.tags
    .map((tag) => {
      const on = selectedTags.some((item) => item.toLowerCase() === tag.toLowerCase());
      return `<label class="md-check"><input type="checkbox" name="tag" value="${escapeHtml(tag)}"${on ? " checked" : ""} /> ${escapeHtml(tag)}</label>`;
    })
    .join("");
  const knownDienst = options.diensten.some((item) => item.toLowerCase() === (values.dienst ?? "").toLowerCase());
  const diensten = [
    `<option value="">Kies een dienst</option>`,
    ...options.diensten.map((item) => {
      const selected = (values.dienst ?? "") === item ? " selected" : "";
      return `<option value="${escapeHtml(item)}"${selected}>${escapeHtml(item)}</option>`;
    }),
    `<option value="__nieuw__"${values.dienst && !knownDienst ? " selected" : ""}>Andere dienst, voorstellen</option>`,
  ].join("");
  const knownCategory = options.categories.some(
    (item) => item.toLowerCase() === (values.category ?? "").toLowerCase(),
  );
  const categoryOptions = [
    `<option value="">Kies een categorie</option>`,
    ...options.categories.map((item) => {
      const selected = (values.category ?? "") === item ? " selected" : "";
      return `<option value="${escapeHtml(item)}"${selected}>${escapeHtml(item)}</option>`;
    }),
    `<option value="__nieuw__"${values.category && !knownCategory ? " selected" : ""}>Andere, voorstellen</option>`,
  ].join("");
  const ai = values.aiOrigin ?? "";
  const sources = parseCitations(values.bronnen);
  const sourceRows = (sources.length ? sources : [{ name: "", url: "" }])
    .map(
      (item) => `<div class="bron-row">
        <label class="field"><span class="field-label">Naam bron</span>
          <input class="input" name="bron_naam" data-bron-naam value="${escapeHtml(item.name)}" placeholder="Bijvoorbeeld NIPV" />
        </label>
        <label class="field"><span class="field-label">Link</span>
          <input class="input" name="bron_url" data-bron-url type="url" inputmode="url" value="${escapeHtml(item.url ?? "")}" placeholder="https://" />
        </label>
      </div>`,
    )
    .join("");
  const heading =
    values.modus === "aanpassen" ? "Dit stuk aanpassen" : values.locked ? "Dit stuk aanvullen" : "Schrijf mee";

  return layout(
    {
      title: values.locked ? (values.modus === "aanpassen" ? "Aanpassen" : "Aanvullen") : "Schrijven",
      description: "Stuur een artikel in. Bronnen en AI-herkomst zijn verplicht.",
      path: "/bijdragen",
      scripts: ["/assets/contribute.js"],
      jsonBlock: { id: "mention-data", json: JSON.stringify(options.mentions) },
    },
    `
    <section class="form-narrow stack">
      <p class="eyebrow">Voor en door de kolommen</p>
      <h1>${heading}</h1>
      <p class="lead">Geen account. Een beheerder leest na. Zet de naam van de bron en de link. Zeg of AI is gebruikt.</p>
      ${values.locked ? `<p class="lock-note">Titel ligt vast. Je wijzigt of vult dit onderwerp aan, niet een ander.</p>` : ""}
      ${values.notice ? `<p class="ok">${escapeHtml(values.notice)}</p>` : ""}
      ${values.error ? `<p class="error">${escapeHtml(values.error)}</p>` : ""}
      <form method="post" action="/bijdragen" class="stack" id="schrijf-form" data-vast="${locked ? "1" : "0"}">
        <input type="hidden" name="slug" id="slug" value="${escapeHtml(values.slug ?? "")}" />
        <input type="hidden" name="vast" value="${locked ? "1" : "0"}" />
        <input type="hidden" name="modus" value="${escapeHtml(values.modus ?? "nieuw")}" />
        <input type="hidden" name="tags" id="tags" value="${escapeHtml(values.tags ?? "")}" />
        <input type="hidden" name="bronnen" id="bronnen" value="${escapeHtml(values.bronnen ?? "")}" />
        <label class="field"><span class="field-label">Titel</span>
          <input class="input" name="title" id="title" required maxlength="180" value="${escapeHtml(values.title ?? "")}" ${locked ? "readonly" : ""} />
        </label>
        <div class="field field-switch">
          <label class="field-label" for="dienst">Dienst</label>
          <select class="input" name="dienst" id="dienst" required>${diensten}</select>
          <div class="when-new" id="dienst-new-wrap">
            <label class="field-label" for="dienst_new">Nieuwe dienst</label>
            <input class="input" name="dienst_new" id="dienst_new" maxlength="80" value="${escapeHtml(values.dienstNew ?? (!knownDienst ? (values.dienst ?? "") : ""))}" placeholder="Bijvoorbeeld Kustwacht" />
            <span class="hint">Die ziet een ander pas in de lijst na keuring.</span>
          </div>
        </div>
        <div class="field field-switch">
          <label class="field-label" for="category">Categorie</label>
          <select class="input" name="category" id="category" required>${categoryOptions}</select>
          <div class="when-new" id="category-new-wrap">
            <label class="field-label" for="category_new">Nieuwe categorie</label>
            <input class="input" name="category_new" id="category_new" maxlength="80" value="${escapeHtml(values.categoryNew ?? (!knownCategory ? (values.category ?? "") : ""))}" placeholder="Bijvoorbeeld Uitrusting" />
            <span class="hint">Die ziet een ander pas in de lijst na keuring.</span>
          </div>
        </div>
        <div class="field">
          <span class="field-label">Tags</span>
          <div class="chip-pick" id="tag-pick">${tagButtons}</div>
          <div class="tag-add mt-3">
            <input class="input" id="tag-new" name="tag_new" maxlength="40" placeholder="Nieuwe tag voorstellen" />
            <button class="btn btn-secondary" type="button" id="tag-add">Toevoegen</button>
          </div>
          <span class="hint">Vink aan wat past. Een nieuwe tag keurt een beheerder eerst.</span>
        </div>
        <label class="field"><span class="field-label">Korte samenvatting</span><textarea class="textarea" name="summary" rows="2">${escapeHtml(values.summary ?? "")}</textarea></label>
        <div class="field mention-wrap">
          <label class="field-label" for="body">Tekst</label>
          <div class="editor-bar">
            <button class="btn btn-ghost btn-sm" type="button" id="fmt-ul">Lijst</button>
            <button class="btn btn-ghost btn-sm" type="button" id="fmt-ol">Nummers</button>
            <button class="btn btn-ghost btn-sm" type="button" id="fmt-at">Koppel @</button>
          </div>
          <textarea class="textarea" name="body" id="body" required rows="14">${escapeHtml(values.body ?? "")}</textarea>
          <div class="mention-menu" id="mention-menu" hidden></div>
          <span class="hint">Plakken mag. We houden platte tekst, lijsten en interne koppelingen. Typ @ en kies een artikel. Dat wordt @artikelnaam.</span>
        </div>
        <div class="field">
          <span class="field-label">Bronnen</span>
          <div id="bron-list" class="stack">${sourceRows}</div>
          <button class="btn btn-ghost btn-sm mt-3" type="button" id="bron-add">Nog een bron</button>
          <span class="hint">Naam van de bron en de link. De link opent later in een nieuw venster.</span>
        </div>
        <fieldset class="choice-set">
          <legend class="field-label">Herkomst van de tekst</legend>
          <label class="choice">
            <input type="radio" name="ai_origin" value="mens" ${ai === "mens" ? "checked" : ""} required />
            <span><strong>Door een mens</strong><span>Zonder generatieve AI voor de inhoud.</span></span>
          </label>
          <label class="choice">
            <input type="radio" name="ai_origin" value="ai-ondersteund" ${ai === "ai-ondersteund" ? "checked" : ""} />
            <span><strong>Met AI-hulp</strong><span>AI heeft geholpen. Een mens heeft nagekeken.</span></span>
          </label>
          <label class="choice">
            <input type="radio" name="ai_origin" value="ai-gegenereerd" ${ai === "ai-gegenereerd" ? "checked" : ""} />
            <span><strong>Met AI opgesteld</strong><span>De tekst komt van AI. Een mens keurt na vóór live.</span></span>
          </label>
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
      title: "Agents",
      description: "Neem contact op voor een licentie om AI en agents te koppelen.",
      path: "/toegang",
    },
    `<section class="form-narrow">
      <p class="eyebrow">Agents</p>
      <h1>AI en agents koppelen</h1>
      <p class="lead">Wil je AI of agents koppelen aan deze wiki, zodat we samen betere informatie bouwen over Nederlandse uniforme diensten.</p>
      <p>Neem contact op voor een licentie.</p>
      <p><a class="contact-mail" href="mailto:mail@contact.thisline.eu">mail@contact.thisline.eu</a></p>
      <p class="hint mt-6">Een licentie laat een agent artikelen lezen en verzoeken indienen. Publiceren gebeurt pas na keuring. Beheer (THISLINE) kan vanuit een agent zelf publiceren en verzoeken beoordelen.</p>
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
    `<section class="privacy form-narrow">
      <p class="eyebrow">Privacy first</p>
      <h1>Wat we wel en niet doen</h1>
      <p class="lead">UniformWiki is gemaakt om kennis te delen, niet om mensen te volgen. We slaan geen accounts van lezers op. Lettertypes komen van Bunny Fonts, niet van Google.</p>
      <h2>Lezen</h2>
      <p>Bezoeken worden niet van een naam voorzien. We zetten geen analytics, geen pixels en geen advertentienetwerken van derden. De blokken voor Pulse, Front Line Cards en het platform zijn van THISLINE zelf.</p>
      <h2>Schrijven</h2>
      <p>Een naam is optioneel en blijft alleen bij de revisie. BSN, e-mailadressen en Nederlandse telefoonnummers worden uit de tekst gehaald voordat iets wordt opgeslagen.</p>
      <h2>Beheer</h2>
      <p>Er is één HttpOnly-cookie, alleen op /beheer, alleen als je als beheerder inlogt.</p>
      <h2>Licenties</h2>
      <p>Wie AI of agents wil koppelen, vraagt een licentie aan via mail@contact.thisline.eu. E-mail bij een licentie is geen mailinglijst.</p>
      <h2>Europa</h2>
      <p>De wiki draait in Europa en is bedoeld voor bezoek uit Europa. Zoekmachines en AI-crawlers laten we wél binnen, zodat de kennis vindbaar blijft.</p>
      <p class="meta mt-6">Vragen: <a href="mailto:mail@contact.thisline.eu">mail@contact.thisline.eu</a></p>
    </section>`,
  );
}

export function graphPage(payload: { nodes: unknown[]; edges: unknown[] }, focus = ""): string {
  return layout(
    {
      title: "KennisWeb",
      description: "Zie in één beeld wat bij een thema, tag of kolom hoort.",
      path: "/kennisweb",
      scripts: ["/assets/graph.js"],
      jsonBlock: { id: "graph-data", json: JSON.stringify({ ...payload, focus }) },
    },
    `
    <section>
      <p class="eyebrow">Wat bij elkaar hoort</p>
      <h1>KennisWeb</h1>
      <p class="lead">Artikelen, kolommen, tags en verwijzingen. Sleep, zoom, klik. Alleen relaties uit de teksten zelf. Onder elk artikel kun je zelf een koppeling leggen.</p>
      <div class="chips">
        <a class="chip ${!focus ? "chip-lime" : ""}" href="/kennisweb">Alles</a>
        ${KOLOMMEN.map((kolom) => `<a class="chip" href="/dienst/${kolom.id}">${escapeHtml(kolom.label)}</a>`).join("")}
      </div>
      <div class="graph-legend"><span>Wit · artikel</span><span>Lime · tag</span><span>Ring · kolom</span><span>Grijs · categorie</span></div>
      <p id="kennisweb-leeg" class="empty" hidden>Nog te weinig koppelingen. Koppel een artikel met @ onder een stuk.</p>
      <div class="graph-wrap"><canvas id="kennisweb" width="1100" height="520" aria-label="KennisWeb"></canvas></div>
    </section>
    ${promoRow("graaf")}
    ${sponsorLine()}`,
  );
}

export function dienstPage(kolom: PublicColumn, articles: ArticleRow[]): string {
  if (kolom.themes.length === 0) {
    const list = articles.map(articleTeaser).join("");
    return layout(
      {
        title: kolom.label,
        description: kolom.summary,
        path: `/dienst/${kolom.id}`,
        jsonLd: breadcrumbJsonLd([
          { name: "Start", path: "/" },
          { name: kolom.label, path: `/dienst/${kolom.id}` },
        ]),
      },
      `
    <div class="home-start">
      ${crumbs([{ href: "/", label: "Start" }, { label: kolom.label }])}
      <section>
        <p class="eyebrow">Dienst</p>
        <h1>${escapeHtml(kolom.label)}</h1>
        <p class="lead">${escapeHtml(kolom.summary)}</p>
      </section>
      <section class="mt-6">${list || `<div class="empty">Nog geen goedgekeurde stukken. <a href="/bijdragen?dienst=${encodeURIComponent(kolom.label)}">Schrijf het eerste</a>.</div>`}</section>
      <p class="chooser-back"><a href="/">Andere dienst</a></p>
    </div>
    ${sponsorLine()}`,
    );
  }
  const rows = kolom.themes
    .map((theme) => {
      const count = articles.filter((article) => articleMatchesTheme(article, theme)).length;
      return chooseRow(
        `/dienst/${encodeURIComponent(kolom.id)}/${encodeURIComponent(theme.slug)}`,
        theme.title,
        theme.summary,
        stukkenLabel(count),
      );
    })
    .join("");
  return layout(
    {
      title: kolom.label,
      description: `${kolom.summary} Kies een thema.`,
      path: `/dienst/${kolom.id}`,
      jsonLd: breadcrumbJsonLd([
        { name: "Start", path: "/" },
        { name: kolom.label, path: `/dienst/${kolom.id}` },
      ]),
    },
    `
    <div class="home-start">
      ${crumbs([{ href: "/", label: "Start" }, { label: kolom.label }])}
      <section>
        <p class="eyebrow">${escapeHtml(kolom.label)}</p>
        <h1>Welk thema?</h1>
        <p class="lead">${escapeHtml(kolom.summary)}</p>
      </section>
      ${pickList(rows, `Thema’s in ${kolom.label}`)}
      <p class="chooser-back"><a href="/">Andere dienst</a></p>
    </div>
    ${sponsorLine()}`,
  );
}

export function themePage(kolom: PublicColumn, theme: Thema, articles: ArticleRow[]): string {
  const list = articles.map(articleTeaser).join("");
  const empty = articles.length === 0;
  return layout(
    {
      title: `${theme.title} · ${kolom.label}`,
      description: theme.summary,
      path: `/dienst/${kolom.id}/${theme.slug}`,
      jsonLd: breadcrumbJsonLd([
        { name: "Start", path: "/" },
        { name: kolom.label, path: `/dienst/${kolom.id}` },
        { name: theme.title, path: `/dienst/${kolom.id}/${theme.slug}` },
      ]),
    },
    `
    <div class="home-start">
      ${crumbs([
        { href: "/", label: "Start" },
        { href: `/dienst/${kolom.id}`, label: kolom.label },
        { label: theme.title },
      ])}
      <section>
        <p class="eyebrow">${escapeHtml(kolom.label)}</p>
        <h1>${escapeHtml(theme.title)}</h1>
        <p class="lead">${escapeHtml(theme.summary)}</p>
      </section>
      <section class="mt-6" aria-label="Artikelen">
        ${
          empty
            ? `<div class="empty">
                <p>Dit thema heeft nog geen stuk.</p>
                <a class="btn btn-primary" href="/bijdragen?slug=${encodeURIComponent(theme.slug)}&title=${encodeURIComponent(theme.title)}&dienst=${encodeURIComponent(kolom.label)}&vast=1">Aanvullen</a>
              </div>`
            : `<div class="article-list">${list}</div>`
        }
      </section>
      <p class="chooser-back"><a href="/dienst/${encodeURIComponent(kolom.id)}">Ander thema</a></p>
    </div>
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
      title: "Aanvullen",
      description: "Thema’s en verwijzingen die nog een artikel missen.",
      path: "/aanvullen",
    },
    `<section>
      <p class="eyebrow">Wat nog openstaat</p>
      <h1>Aanvullen</h1>
      <p class="lead">De kolommen en thema’s liggen vast. De stukken komen van mensen in uniform. Ken je dit, vul het aan, met bron.</p>
    </section>
    ${items || `<div class="empty">Niets open. Dat is zeldzaam. Kijk bij samenhang of schrijf zelf.</div>`}
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
    tag: "badge-wait",
    category: "badge-ok",
    dienst: "badge-lime",
  };
  return `<span class="badge ${map[status] ?? "badge-off"}">${escapeHtml(status)}</span>`;
}

export function adminDashboard(input: {
  pending: Array<RevisionRow & { slug: string }>;
  articles: ArticleRow[];
  keys: ApiKeyRow[];
  vocab: VocabRow[];
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
  const vocabRows = input.vocab
    .map(
      (item) => `<article class="card">
        <p class="eyebrow">${escapeHtml(item.kind)}</p>
        <h3 class="h3">${escapeHtml(item.label)}</h3>
        <p class="meta">${escapeHtml(item.created_at)}</p>
        <div class="row mt-4">
          <form method="post" action="/beheer/vocab">
            <input type="hidden" name="vocab_id" value="${item.id}" />
            <input type="hidden" name="decision" value="approved" />
            <button class="btn btn-primary btn-sm" type="submit">Goedkeuren</button>
          </form>
          <form method="post" action="/beheer/vocab">
            <input type="hidden" name="vocab_id" value="${item.id}" />
            <input type="hidden" name="decision" value="rejected" />
            <button class="btn btn-danger btn-sm" type="submit">Afwijzen</button>
          </form>
        </div>
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
      <div><h1>Beheer</h1><p class="lead">Keur bijdragen, tags en categorieën. Check bronnen. Exporteer een backup.</p></div>
      <div class="row">
        <a class="btn btn-secondary" href="/beheer/export.json">JSON-export</a>
        <form method="post" action="/beheer/logout"><button class="btn btn-ghost" type="submit">Uitloggen</button></form>
      </div>
    </div>
    ${input.notice ? `<p class="ok">${escapeHtml(input.notice)}</p>` : ""}
    <section class="mt-8"><h2>Wachtend op keuring</h2><div class="stack mt-4">${pendingRows || `<p class="empty">Geen openstaande bijdragen.</p>`}</div></section>
    <section class="mt-8"><h2>Nieuwe tags en categorieën</h2><div class="stack mt-4">${vocabRows || `<p class="empty">Geen openstaande voorstellen.</p>`}</div></section>
    <section class="mt-8">
      <h2>Direct publiceren</h2>
      <form method="post" action="/beheer/artikel" class="card grid-2 mt-4">
        <label class="field span-2"><span class="field-label">Titel</span><input class="input" name="title" required /></label>
        <label class="field"><span class="field-label">Kolom</span><input class="input" name="dienst" placeholder="Brandweer" /></label>
        <label class="field"><span class="field-label">Categorie</span><input class="input" name="category" required /></label>
        <label class="field"><span class="field-label">Naam bron</span><input class="input" name="bron_naam" required placeholder="NIPV" /></label>
        <label class="field"><span class="field-label">Link</span><input class="input" name="bron_url" type="url" placeholder="https://" /></label>
        <label class="field span-2"><span class="field-label">Tags</span><input class="input" name="tags" /></label>
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
