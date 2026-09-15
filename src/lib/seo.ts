import { config } from "../config.js";
import { parseCitations } from "./citations.js";
import { articleTags } from "./links.js";
import { parseStoredMetadata } from "./metadata.js";
import { KOLOMMEN } from "./taxonomy.js";
import type { ArticleRow } from "../types.js";

function abs(path: string): string {
  return `${config.publicBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

function isoDate(value: string | undefined): string {
  if (!value) {
    return new Date().toISOString().slice(0, 10);
  }
  const day = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : new Date().toISOString().slice(0, 10);
}

function xml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function robotsTxt(): string {
  const sitemap = abs("/sitemap.xml");
  const bots = [
    "*",
    "Googlebot",
    "Google-Extended",
    "Google-InspectionTool",
    "Bingbot",
    "GPTBot",
    "ChatGPT-User",
    "OAI-SearchBot",
    "ClaudeBot",
    "anthropic-ai",
    "PerplexityBot",
    "Applebot",
    "Applebot-Extended",
    "CCBot",
    "Bytespider",
    "cohere-ai",
    "Amazonbot",
    "meta-externalagent",
    "FacebookBot",
    "YouBot",
    "KagiBot",
    "AhrefsBot",
    "SemrushBot",
    "DuckDuckBot",
  ];
  const blocks = bots.map(
    (agent) => `User-agent: ${agent}\nAllow: /\nDisallow: /beheer\nDisallow: /webhooks\n`,
  );
  return `${blocks.join("\n")}Sitemap: ${sitemap}\n`;
}

export function sitemapXml(articles: ArticleRow[]): string {
  const staticPages: Array<{ path: string; changefreq: string; priority: string }> = [
    { path: "/", changefreq: "daily", priority: "1.0" },
    { path: "/kennisweb", changefreq: "daily", priority: "0.8" },
    { path: "/aanvullen", changefreq: "daily", priority: "0.7" },
    { path: "/bijdragen", changefreq: "weekly", priority: "0.5" },
    { path: "/toegang", changefreq: "monthly", priority: "0.4" },
    { path: "/privacy", changefreq: "yearly", priority: "0.3" },
    { path: "/llms.txt", changefreq: "daily", priority: "0.6" },
    { path: "/feed.xml", changefreq: "daily", priority: "0.6" },
    ...KOLOMMEN.map((kolom) => ({
      path: `/dienst/${kolom.id}`,
      changefreq: "weekly",
      priority: "0.8",
    })),
  ];
  const urls = [
    ...staticPages.map(
      (page) => `  <url>
    <loc>${xml(abs(page.path))}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`,
    ),
    ...articles.flatMap((article) => {
      const lastmod = isoDate(article.updated_at);
      return [
        `  <url>
    <loc>${xml(abs(`/wiki/${article.slug}`))}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`,
        `  <url>
    <loc>${xml(abs(`/wiki/${article.slug}.md`))}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>`,
      ];
    }),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`;
}

export function llmsTxt(articles: ArticleRow[]): string {
  const list = articles
    .map((article) => `- [${article.title}](${abs(`/wiki/${article.slug}.md`)}): ${article.summary}`)
    .join("\n");
  return `# UniformWiki

> Open kennisbank van THISLINE over Nederlandse uniforme diensten: brandweer, ambulance, politie, defensie en handhaving. Voor mensen in uniform, en voor AI-agents die dezelfde nagekeken tekst ophalen.

Deze site is bedoeld om gelezen, geïndexeerd en geciteerd te worden. Artikelen hebben bronnen en vermelden of AI is gebruikt.

## Start

- [Overzicht](${abs("/")}): kolommen en recente artikelen
- [KennisWeb](${abs("/kennisweb")}): samenhang tussen artikelen
- [Aanvullen](${abs("/aanvullen")}): wat nog ontbreekt
- [Privacy](${abs("/privacy")})
- [Markdown-feed](${abs("/feed.xml")})
- [Sitemap](${abs("/sitemap.xml")})
- [OpenAPI](${abs("/openapi.json")})

## Kolommen

${KOLOMMEN.map((kolom) => `- [${kolom.label}](${abs(`/dienst/${kolom.id}`)}): ${kolom.summary}`).join("\n")}

## Artikelen

${list || "- Nog geen goedgekeurde artikelen."}

## Voor agents

Licentie (alleen lezen en verzoeken indienen) of beheer (publiceren en keuren): mail@contact.thisline.eu

MCP: POST ${abs("/api/v1/mcp")} met Authorization: Bearer.

HTML-pagina’s zijn de canon. Elke pagina heeft een Markdown-variant via .md achter de URL.
`;
}

export function rssXml(articles: ArticleRow[]): string {
  const items = articles
    .slice(0, 40)
    .map((article) => {
      const link = abs(`/wiki/${article.slug}`);
      return `    <item>
      <title>${xml(article.title)}</title>
      <link>${xml(link)}</link>
      <guid>${xml(link)}</guid>
      <pubDate>${new Date(article.updated_at || article.created_at).toUTCString()}</pubDate>
      <description>${xml(article.summary)}</description>
    </item>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>UniformWiki</title>
    <link>${xml(abs("/"))}</link>
    <description>Kennisbank voor Nederlandse uniforme diensten. THISLINE.</description>
    <language>nl-NL</language>
${items}
  </channel>
</rss>
`;
}

export function articleMarkdown(article: ArticleRow): string {
  const meta = parseStoredMetadata(article.metadata);
  const tags = articleTags(article);
  const citations = parseCitations(meta.bronnen);
  const bronnen = citations
    .map((item) => (item.url ? `- [${item.name}](${item.url})` : `- ${item.name}`))
    .join("\n");
  return `# ${article.title}

${article.summary}

- Site: ${abs(`/wiki/${article.slug}`)}
- Kolom: ${article.dienst || "—"}
- Categorie: ${article.category}
- Tags: ${tags.join(", ") || "—"}
- AI-herkomst: ${meta.ai || "niet vastgelegd"}
- Bijgewerkt: ${article.updated_at}

## Bronnen

${bronnen || "- Nog geen bronnen."}

## Tekst

${article.body}
`;
}

export function openApiJson(): Record<string, unknown> {
  return {
    openapi: "3.1.0",
    info: {
      title: "UniformWiki",
      description:
        "Kennisbank over Nederlandse uniforme diensten. HTML voor mensen, Markdown/RSS/llms.txt voor crawlers, REST+MCP voor gelicenseerde agents.",
      version: "1.0.0",
    },
    servers: [{ url: config.publicBaseUrl }],
    paths: {
      "/api/wiki": {
        get: {
          summary: "Zoek goedgekeurde artikelen",
          security: [{ bearer: [] }],
        },
        post: {
          summary: "Dien een artikel of verbetering in. Licentie: pending. Beheer: kan publiceren.",
          security: [{ bearer: [] }],
        },
      },
      "/api/wiki/{id}": {
        get: {
          summary: "Haal één goedgekeurd artikel op",
          security: [{ bearer: [] }],
        },
      },
      "/api/v1/mcp": {
        post: { summary: "MCP Streamable HTTP", security: [{ bearer: [] }] },
      },
    },
    components: {
      securitySchemes: {
        bearer: { type: "http", scheme: "bearer" },
      },
    },
  };
}

export function organizationJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://thisline.eu/#org",
        name: "THISLINE",
        url: "https://thisline.eu",
        description: "Voor wie naar voren stapt.",
      },
      {
        "@type": "WebSite",
        "@id": `${abs("/")}#site`,
        name: "UniformWiki",
        url: abs("/"),
        inLanguage: "nl-NL",
        description:
          "Open kennisbank over kleding en uitrusting van Nederlandse uniforme diensten.",
        publisher: { "@id": "https://thisline.eu/#org" },
        potentialAction: {
          "@type": "SearchAction",
          target: `${abs("/")}?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };
}

export function articleJsonLd(article: ArticleRow, citations: ReturnType<typeof parseCitations>): Record<string, unknown> {
  const url = abs(`/wiki/${article.slug}`);
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    mainEntityOfPage: url,
    headline: article.title,
    description: article.summary,
    articleSection: article.dienst || article.category,
    dateModified: article.updated_at,
    datePublished: article.created_at,
    inLanguage: "nl-NL",
    url,
    author: { "@type": "Organization", name: "THISLINE", url: "https://thisline.eu" },
    publisher: { "@type": "Organization", name: "THISLINE", url: "https://thisline.eu" },
    citation: citations.map((item) => ({
      "@type": "CreativeWork",
      name: item.name,
      ...(item.url ? { url: item.url } : {}),
    })),
    keywords: articleTags(article).join(", "),
    isAccessibleForFree: true,
    license: "https://creativecommons.org/licenses/by-sa/4.0/",
  };
}
