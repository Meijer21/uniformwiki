import { config } from "../config.js";
import { escapeHtml, renderMarkdown } from "../lib/markdown.js";
import { parseStoredMetadata } from "../lib/metadata.js";
import type { ApiKeyRow, ArticleRow, CategoryCount, RevisionRow } from "../types.js";

export interface PageOptions {
  title: string;
  description: string;
  path: string;
  jsonLd?: Record<string, unknown>;
  bodyClass?: string;
}

function absoluteUrl(path: string): string {
  return `${config.publicBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

function navLink(href: string, label: string, current: string): string {
  const active = current === href || (href !== "/" && current.startsWith(href));
  const cls = active
    ? "text-stone-950 underline decoration-amber-700 decoration-2 underline-offset-4"
    : "text-stone-600 hover:text-stone-950";
  return `<a href="${href}" class="${cls}">${label}</a>`;
}

export function layout(options: PageOptions, content: string): string {
  const pageTitle =
    options.title === config.siteName ? config.siteName : `${options.title} · ${config.siteName}`;
  const jsonLd = options.jsonLd ? JSON.stringify(options.jsonLd) : "";

  return `<!doctype html>
<html lang="nl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(pageTitle)}</title>
    <meta name="description" content="${escapeHtml(options.description)}" />
    <link rel="canonical" href="${escapeHtml(absoluteUrl(options.path))}" />
    <meta property="og:type" content="website" />
    <meta property="og:locale" content="nl_NL" />
    <meta property="og:site_name" content="${escapeHtml(config.siteName)}" />
    <meta property="og:title" content="${escapeHtml(pageTitle)}" />
    <meta property="og:description" content="${escapeHtml(options.description)}" />
    <meta property="og:url" content="${escapeHtml(absoluteUrl(options.path))}" />
    <meta name="robots" content="index,follow" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=Source+Serif+4:opsz,wght@8..60,500;8..60,600&display=swap" rel="stylesheet" />
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
      tailwind.config = {
        theme: {
          extend: {
            fontFamily: {
              sans: ['IBM Plex Sans', 'ui-sans-serif', 'system-ui'],
              serif: ['Source Serif 4', 'ui-serif', 'Georgia']
            },
            colors: {
              ink: '#1c1410',
              paper: '#f6f0e6'
            }
          }
        }
      }
    </script>
    ${jsonLd ? `<script type="application/ld+json">${jsonLd}</script>` : ""}
  </head>
  <body class="min-h-screen bg-[#f6f0e6] text-stone-900 antialiased ${options.bodyClass ?? ""}">
    <a href="#inhoud" class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:bg-white focus:px-3 focus:py-2">Naar inhoud</a>
    <header class="border-b border-stone-900/10">
      <div class="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
        <a href="/" class="font-serif text-2xl tracking-tight text-stone-950">${escapeHtml(config.siteName)}</a>
        <nav class="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium">
          ${navLink("/", "Overzicht", options.path)}
          ${navLink("/bijdragen", "Bijdragen", options.path)}
          ${navLink("/toegang", "Toegang voor agents", options.path)}
          ${navLink("/beheer", "Beheer", options.path)}
        </nav>
      </div>
    </header>
    <main id="inhoud" class="mx-auto max-w-5xl px-4 py-10 sm:py-14">
      ${content}
    </main>
    <footer class="border-t border-stone-900/10">
      <div class="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-8 text-sm text-stone-600 sm:flex-row sm:justify-between">
        <p>${escapeHtml(config.siteName)} — kennis die mensen lezen en agents bevragen.</p>
        <p><a class="underline decoration-stone-400 underline-offset-2 hover:text-stone-950" href="/sitemap.xml">Sitemap</a></p>
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
): string {
  const empty = articles.length === 0;
  const categoryCards = categories
    .map(
      (item) => `
      <a href="/?categorie=${encodeURIComponent(item.category)}" class="rounded-xl border border-stone-900/10 bg-white/70 p-4 transition hover:border-amber-800/40 hover:bg-white">
        <p class="font-medium text-stone-950">${escapeHtml(item.category)}</p>
        <p class="mt-1 text-sm text-stone-600">${item.count} ${item.count === 1 ? "artikel" : "artikelen"}</p>
      </a>`,
    )
    .join("");

  const articleCards = articles
    .map(
      (article) => `
      <article class="border-b border-stone-900/10 py-6 first:pt-0">
        <p class="text-xs font-medium uppercase tracking-wider text-amber-900">${escapeHtml(article.category)}</p>
        <h2 class="mt-1 font-serif text-2xl">
          <a class="hover:underline" href="/wiki/${encodeURIComponent(article.slug)}">${escapeHtml(article.title)}</a>
        </h2>
        <p class="mt-2 max-w-2xl text-stone-700">${escapeHtml(article.summary)}</p>
      </article>`,
    )
    .join("");

  return layout(
    {
      title: config.siteName,
      description: "Kennisbank over uniformen en beroepskleding. Leesbaar voor mensen, bevraagbaar door AI-agents.",
      path: "/",
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: config.siteName,
        description: "Kennisbank over uniformen en beroepskleding.",
        url: absoluteUrl("/"),
      },
    },
    `
    <section class="max-w-3xl">
      <p class="text-xs font-semibold uppercase tracking-[0.2em] text-amber-900">Open kennisbank</p>
      <h1 class="mt-3 font-serif text-4xl leading-tight text-stone-950 sm:text-5xl">Uniformen uitgelegd, zonder technisch gedoe.</h1>
      <p class="mt-5 max-w-2xl text-lg leading-8 text-stone-700">Zoek een artikel, of stuur een verbetering in via een gewoon formulier. Goedgekeurde teksten zijn meteen zichtbaar voor bezoekers, Google en MCP-clients.</p>
    </section>
    <form method="get" action="/" class="mt-10 flex flex-col gap-3 sm:flex-row">
      <label class="sr-only" for="q">Zoeken</label>
      <input id="q" name="q" value="${escapeHtml(query)}" placeholder="Zoek op titel, categorie of trefwoord" class="w-full rounded-lg border border-stone-900/15 bg-white px-4 py-3 text-stone-900 outline-none ring-amber-800/30 focus:ring-2" />
      <button type="submit" class="rounded-lg bg-stone-950 px-5 py-3 font-medium text-paper hover:bg-stone-800">Zoeken</button>
    </form>
    ${notice ? `<p class="mt-6 rounded-lg border border-amber-800/20 bg-amber-50 px-4 py-3 text-sm text-amber-950">${escapeHtml(notice)}</p>` : ""}
    <section class="mt-12">
      <h2 class="font-serif text-2xl text-stone-950">Categorieën</h2>
      <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        ${
          categories.length > 0
            ? categoryCards
            : `<p class="text-stone-600">Nog geen goedgekeurde categorieën. De eerste goedgekeurde bijdrage verschijnt hier.</p>`
        }
      </div>
    </section>
    <section class="mt-14">
      <div class="flex items-end justify-between gap-4">
        <h2 class="font-serif text-2xl text-stone-950">${query ? `Resultaten voor “${escapeHtml(query)}”` : "Recente artikelen"}</h2>
        <a href="/bijdragen" class="text-sm font-medium text-amber-900 hover:underline">Zelf iets toevoegen</a>
      </div>
      <div class="mt-6">
        ${
          empty
            ? `<div class="rounded-xl border border-dashed border-stone-400 bg-white/40 px-5 py-10 text-center text-stone-600">Geen artikelen gevonden. Probeer een kortere zoekterm of <a class="underline" href="/bijdragen">schrijf het eerste stuk</a>.</div>`
            : articleCards
        }
      </div>
    </section>`,
  );
}

export function articlePage(article: ArticleRow, revisions: RevisionRow[]): string {
  const metadata = parseStoredMetadata(article.metadata);
  const metaRows = Object.entries(metadata)
    .filter(([, value]) => value)
    .map(
      ([key, value]) => `
      <div class="flex flex-col gap-1 border-t border-stone-900/10 py-3 first:border-t-0 sm:flex-row sm:gap-6">
        <dt class="w-36 shrink-0 text-xs font-semibold uppercase tracking-wider text-stone-500">${escapeHtml(key)}</dt>
        <dd class="text-stone-800">${escapeHtml(value ?? "")}</dd>
      </div>`,
    )
    .join("");

  const changelog = revisions
    .map(
      (revision, index) => `
      <li class="relative pl-6">
        <span class="absolute left-0 top-1.5 h-2 w-2 rounded-full ${revision.status === "approved" ? "bg-amber-800" : "bg-stone-400"}"></span>
        <p class="text-sm font-medium text-stone-950">${escapeHtml(revision.title)}</p>
        <p class="text-sm text-stone-600">${escapeHtml(revision.created_at)} · ${escapeHtml(revision.contributor_name)} · ${escapeHtml(revision.status)}${index === 0 ? " · huidig voorstel of actieve versie" : ""}</p>
        ${revision.contributor_note ? `<p class="mt-1 text-sm text-stone-600">${escapeHtml(revision.contributor_note)}</p>` : ""}
      </li>`,
    )
    .join("");

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
        mainEntityOfPage: absoluteUrl(`/wiki/${article.slug}`),
        author: { "@type": "Organization", name: config.siteName },
      },
    },
    `
    <article class="grid gap-10 lg:grid-cols-[minmax(0,1fr)_16rem]">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-amber-900">${escapeHtml(article.category)}</p>
        <h1 class="mt-2 font-serif text-4xl leading-tight text-stone-950">${escapeHtml(article.title)}</h1>
        <p class="mt-4 text-lg text-stone-700">${escapeHtml(article.summary)}</p>
        <div class="prose-wiki mt-8 max-w-2xl text-stone-800">${renderMarkdown(article.body)}</div>
        <p class="mt-10 text-sm text-stone-600">Klopt er iets niet? <a class="underline decoration-amber-800/50 underline-offset-2" href="/bijdragen?slug=${encodeURIComponent(article.slug)}">Stuur een nieuwe versie in</a> — zonder account.</p>
      </div>
      <aside class="space-y-8">
        <section class="rounded-xl border border-stone-900/10 bg-white/70 p-5">
          <h2 class="font-serif text-lg">Metadata</h2>
          <dl class="mt-3">
            ${metaRows || `<p class="text-sm text-stone-600">Geen extra metadata.</p>`}
          </dl>
        </section>
        <section class="rounded-xl border border-stone-900/10 bg-white/50 p-5">
          <h2 class="font-serif text-lg">Geschiedenis</h2>
          <ol class="mt-4 space-y-4">${changelog || `<li class="text-sm text-stone-600">Nog geen revisies.</li>`}</ol>
        </section>
      </aside>
    </article>`,
  );
}

export function notFoundPage(message = "Dit artikel is er niet, of het wacht nog op goedkeuring."): string {
  return layout(
    {
      title: "Niet gevonden",
      description: message,
      path: "/404",
    },
    `
    <section class="max-w-xl">
      <h1 class="font-serif text-4xl">Pagina niet gevonden</h1>
      <p class="mt-4 text-lg text-stone-700">${escapeHtml(message)}</p>
      <p class="mt-6"><a class="font-medium text-amber-900 underline" href="/">Terug naar het overzicht</a></p>
    </section>`,
  );
}

export function errorPage(message: string): string {
  return layout(
    {
      title: "Er ging iets mis",
      description: message,
      path: "/fout",
    },
    `
    <section class="max-w-xl">
      <h1 class="font-serif text-4xl">Er ging iets mis</h1>
      <p class="mt-4 text-lg text-stone-700">${escapeHtml(message)}</p>
      <p class="mt-6"><a class="font-medium text-amber-900 underline" href="/">Terug naar het overzicht</a></p>
    </section>`,
  );
}

export function contributePage(values: {
  title?: string;
  slug?: string;
  category?: string;
  summary?: string;
  body?: string;
  name?: string;
  note?: string;
  notice?: string;
  error?: string;
}): string {
  const field = (
    name: string,
    label: string,
    value: string,
    extra = "",
  ): string => `
    <label class="block">
      <span class="text-sm font-medium text-stone-800">${label}</span>
      <input name="${name}" value="${escapeHtml(value)}" ${extra} class="mt-1 w-full rounded-lg border border-stone-900/15 bg-white px-3 py-2 outline-none ring-amber-800/30 focus:ring-2" />
    </label>`;

  return layout(
    {
      title: "Bijdragen",
      description: "Stuur een artikel of verbetering in. Geen account nodig.",
      path: "/bijdragen",
    },
    `
    <section class="max-w-2xl">
      <h1 class="font-serif text-4xl text-stone-950">Schrijf mee</h1>
      <p class="mt-4 text-lg text-stone-700">Geen Git, geen editor, geen inlog. Een beheerder leest je tekst na. BSN, e-mailadressen en telefoonnummers worden automatisch weggehaald.</p>
      ${values.notice ? `<p class="mt-6 rounded-lg border border-emerald-800/20 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">${escapeHtml(values.notice)}</p>` : ""}
      ${values.error ? `<p class="mt-6 rounded-lg border border-red-800/20 bg-red-50 px-4 py-3 text-sm text-red-950">${escapeHtml(values.error)}</p>` : ""}
      <form method="post" action="/bijdragen" class="mt-8 space-y-5 rounded-2xl border border-stone-900/10 bg-white/70 p-5 sm:p-7">
        ${field("title", "Titel", values.title ?? "", 'required maxlength="180"')}
        ${field("slug", "Slug (laat leeg voor een nieuwe pagina, of gebruik de bestaande slug om te verbeteren)", values.slug ?? "")}
        ${field("category", "Categorie", values.category ?? "", 'required maxlength="80" placeholder="Bijvoorbeeld Begrippen"')}
        <label class="block">
          <span class="text-sm font-medium text-stone-800">Korte samenvatting</span>
          <textarea name="summary" rows="2" class="mt-1 w-full rounded-lg border border-stone-900/15 bg-white px-3 py-2 outline-none ring-amber-800/30 focus:ring-2">${escapeHtml(values.summary ?? "")}</textarea>
        </label>
        <label class="block">
          <span class="text-sm font-medium text-stone-800">Tekst (Markdown mag)</span>
          <textarea name="body" required rows="14" class="mt-1 w-full rounded-lg border border-stone-900/15 bg-white px-3 py-2 font-mono text-sm outline-none ring-amber-800/30 focus:ring-2">${escapeHtml(values.body ?? "---\nbronnen: \nlicentie: CC-BY-SA-4.0\ntrefwoorden: \n---\n\n")}</textarea>
        </label>
        ${field("contributor_name", "Jouw naam of initialen", values.name ?? "")}
        ${field("contributor_note", "Toelichting voor de beheerder", values.note ?? "")}
        <button type="submit" class="rounded-lg bg-stone-950 px-5 py-3 font-medium text-paper hover:bg-stone-800">Insturen ter beoordeling</button>
      </form>
    </section>`,
  );
}

export function accessPage(): string {
  return layout(
    {
      title: "Toegang voor agents",
      description: "MCP- en API-toegang tot UniformWiki via een FluentCart-licentie.",
      path: "/toegang",
    },
    `
    <section class="max-w-2xl">
      <h1 class="font-serif text-4xl">Toegang voor AI-agents</h1>
      <p class="mt-4 text-lg text-stone-700">Mensen lezen de wiki gratis. Agents die artikelen programmatisch ophalen, doen dat met een licentiesleutel. Die sleutel komt uit FluentCart zodra een bestelling of abonnement actief is.</p>
      <ol class="mt-8 list-decimal space-y-3 pl-5 text-stone-800">
        <li>Koop of verleng een licentie in de webshop.</li>
        <li>FluentCart stuurt een webhook naar deze app.</li>
        <li>Er ontstaat een sleutel <code class="rounded bg-stone-200 px-1">uw_live_…</code>.</li>
        <li>De shop-eigenaar kopieert die sleutel onder Beheer en stuurt hem naar de klant.</li>
      </ol>
      <div class="mt-8 space-y-3 rounded-xl border border-stone-900/10 bg-white/70 p-5 text-sm leading-6">
        <p><strong>MCP</strong> — <code>GET/POST ${escapeHtml(config.publicBaseUrl)}/api/v1/mcp</code></p>
        <p><strong>SSE-berichten</strong> — <code>POST ${escapeHtml(config.publicBaseUrl)}/api/v1/mcp/messages</code></p>
        <p><strong>Header</strong> — <code>Authorization: Bearer uw_live_…</code></p>
        <p><strong>Tool</strong> — <code>get_uniform_article</code> met <code>article_id</code> (id of slug), plus <code>search_uniform_articles</code>.</p>
      </div>
    </section>`,
  );
}

export function adminLoginPage(error?: string): string {
  return layout(
    {
      title: "Beheer",
      description: "Aanmelden voor moderatie en licenties.",
      path: "/beheer",
    },
    `
    <section class="max-w-md">
      <h1 class="font-serif text-4xl">Beheer</h1>
      <p class="mt-4 text-stone-700">Plak de beheersleutel. Die staat in <code>ADMIN_API_KEY</code>.</p>
      ${error ? `<p class="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-950">${escapeHtml(error)}</p>` : ""}
      <form method="post" action="/beheer/login" class="mt-6 space-y-4 rounded-xl border border-stone-900/10 bg-white/70 p-5">
        <label class="block">
          <span class="text-sm font-medium">Beheersleutel</span>
          <input type="password" name="key" required class="mt-1 w-full rounded-lg border border-stone-900/15 bg-white px-3 py-2" />
        </label>
        <button class="rounded-lg bg-stone-950 px-4 py-2 font-medium text-paper" type="submit">Open beheer</button>
      </form>
    </section>`,
  );
}

function statusBadge(status: string): string {
  const map: Record<string, string> = {
    pending: "bg-amber-100 text-amber-950",
    approved: "bg-emerald-100 text-emerald-950",
    rejected: "bg-stone-200 text-stone-700",
    active: "bg-emerald-100 text-emerald-950",
    suspended: "bg-red-100 text-red-950",
    revoked: "bg-stone-200 text-stone-700",
    admin: "bg-stone-900 text-paper",
    mcp: "bg-amber-100 text-amber-950",
    public_read: "bg-sky-100 text-sky-950",
  };
  return `<span class="rounded-full px-2 py-0.5 text-xs font-medium ${map[status] ?? "bg-stone-100"}">${escapeHtml(status)}</span>`;
}

export function adminDashboard(input: {
  pending: Array<RevisionRow & { slug: string }>;
  articles: ArticleRow[];
  keys: ApiKeyRow[];
  notice?: string;
}): string {
  const pendingRows = input.pending
    .map(
      (item) => `
      <article class="rounded-xl border border-stone-900/10 bg-white p-5">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="text-xs uppercase tracking-wider text-amber-900">${escapeHtml(item.category)} · ${escapeHtml(item.slug)}</p>
            <h3 class="mt-1 font-serif text-xl">${escapeHtml(item.title)}</h3>
            <p class="mt-1 text-sm text-stone-600">${escapeHtml(item.contributor_name)} · ${escapeHtml(item.created_at)}</p>
            ${item.contributor_note ? `<p class="mt-2 text-sm">${escapeHtml(item.contributor_note)}</p>` : ""}
          </div>
          <div class="flex gap-2">
            <form method="post" action="/beheer/beslissing">
              <input type="hidden" name="revision_id" value="${item.id}" />
              <input type="hidden" name="decision" value="approved" />
              <button class="rounded-lg bg-stone-950 px-3 py-2 text-sm text-paper" type="submit">Goedkeuren</button>
            </form>
            <form method="post" action="/beheer/beslissing">
              <input type="hidden" name="revision_id" value="${item.id}" />
              <input type="hidden" name="decision" value="rejected" />
              <button class="rounded-lg border border-stone-300 px-3 py-2 text-sm" type="submit">Afwijzen</button>
            </form>
          </div>
        </div>
        <p class="mt-3 text-sm text-stone-700">${escapeHtml(item.summary)}</p>
        <details class="mt-3">
          <summary class="cursor-pointer text-sm font-medium text-amber-900">Tekst bekijken</summary>
          <div class="mt-3 max-w-none text-sm">${renderMarkdown(item.body)}</div>
        </details>
      </article>`,
    )
    .join("");

  const articleRows = input.articles
    .map(
      (article) => `
      <tr class="border-t border-stone-900/10">
        <td class="py-2 pr-3"><a class="underline" href="/wiki/${encodeURIComponent(article.slug)}">${escapeHtml(article.title)}</a></td>
        <td class="py-2 pr-3">${escapeHtml(article.category)}</td>
        <td class="py-2 pr-3">${statusBadge(article.status)}</td>
        <td class="py-2 text-stone-600">${escapeHtml(article.updated_at)}</td>
      </tr>`,
    )
    .join("");

  const keyRows = input.keys
    .map(
      (key) => `
      <tr class="border-t border-stone-900/10 align-top">
        <td class="py-2 pr-3 font-mono text-xs break-all">${escapeHtml(key.key)}</td>
        <td class="py-2 pr-3">${statusBadge(key.tier)}</td>
        <td class="py-2 pr-3">${statusBadge(key.status)}</td>
        <td class="py-2 pr-3 text-sm">${escapeHtml(key.customer_email ?? "—")}</td>
        <td class="py-2 text-sm text-stone-600">${escapeHtml(key.expires_at ?? "geen einde")}</td>
      </tr>`,
    )
    .join("");

  return layout(
    {
      title: "Beheer",
      description: "Moderatie, artikelen en licentiesleutels.",
      path: "/beheer",
    },
    `
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="font-serif text-4xl">Beheer</h1>
        <p class="mt-2 text-stone-700">Keur bijdragen goed, bekijk licenties en exporteer een backup. Bunny-volumes maken zelf geen kopie.</p>
      </div>
      <div class="flex gap-3 text-sm">
        <a class="rounded-lg border border-stone-300 px-3 py-2" href="/beheer/export.json">JSON-export</a>
        <form method="post" action="/beheer/logout"><button class="rounded-lg px-3 py-2 underline" type="submit">Uitloggen</button></form>
      </div>
    </div>
    ${input.notice ? `<p class="mt-6 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-950">${escapeHtml(input.notice)}</p>` : ""}
    <section class="mt-10">
      <h2 class="font-serif text-2xl">Wachtend op keuring</h2>
      <div class="mt-4 space-y-4">
        ${pendingRows || `<p class="rounded-xl border border-dashed border-stone-300 px-4 py-8 text-stone-600">Geen openstaande bijdragen.</p>`}
      </div>
    </section>
    <section class="mt-12">
      <h2 class="font-serif text-2xl">Direct publiceren</h2>
      <form method="post" action="/beheer/artikel" class="mt-4 grid gap-4 rounded-xl border border-stone-900/10 bg-white/70 p-5 sm:grid-cols-2">
        <label class="block sm:col-span-2"><span class="text-sm font-medium">Titel</span><input name="title" required class="mt-1 w-full rounded-lg border border-stone-900/15 px-3 py-2" /></label>
        <label class="block"><span class="text-sm font-medium">Categorie</span><input name="category" required class="mt-1 w-full rounded-lg border border-stone-900/15 px-3 py-2" /></label>
        <label class="block"><span class="text-sm font-medium">Slug (optioneel, overschrijft bestaand)</span><input name="slug" class="mt-1 w-full rounded-lg border border-stone-900/15 px-3 py-2" /></label>
        <label class="block sm:col-span-2"><span class="text-sm font-medium">Samenvatting</span><textarea name="summary" rows="2" class="mt-1 w-full rounded-lg border border-stone-900/15 px-3 py-2"></textarea></label>
        <label class="block sm:col-span-2"><span class="text-sm font-medium">Tekst</span><textarea name="body" required rows="8" class="mt-1 w-full rounded-lg border border-stone-900/15 px-3 py-2 font-mono text-sm"></textarea></label>
        <button class="rounded-lg bg-stone-950 px-4 py-2 text-paper sm:col-span-2" type="submit">Publiceren</button>
      </form>
    </section>
    <section class="mt-12 overflow-x-auto">
      <h2 class="font-serif text-2xl">Artikelen</h2>
      <table class="mt-4 w-full min-w-[32rem] text-left text-sm">
        <thead><tr class="text-stone-500"><th class="pb-2">Titel</th><th class="pb-2">Categorie</th><th class="pb-2">Status</th><th class="pb-2">Gewijzigd</th></tr></thead>
        <tbody>${articleRows || `<tr><td class="py-4 text-stone-600" colspan="4">Nog geen artikelen.</td></tr>`}</tbody>
      </table>
    </section>
    <section class="mt-12 overflow-x-auto">
      <h2 class="font-serif text-2xl">Licentiesleutels</h2>
      <p class="mt-2 text-sm text-stone-600">Kopieer een <code>uw_live_</code>-sleutel naar de klant na een FluentCart-bestelling.</p>
      <table class="mt-4 w-full min-w-[40rem] text-left text-sm">
        <thead><tr class="text-stone-500"><th class="pb-2">Sleutel</th><th class="pb-2">Tier</th><th class="pb-2">Status</th><th class="pb-2">E-mail</th><th class="pb-2">Verloopt</th></tr></thead>
        <tbody>${keyRows || `<tr><td class="py-4 text-stone-600" colspan="5">Nog geen sleutels.</td></tr>`}</tbody>
      </table>
    </section>`,
  );
}
