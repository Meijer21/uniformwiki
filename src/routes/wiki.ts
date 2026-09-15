import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  articlePublicJson,
  getApprovedArticle,
  getArticleByAny,
  listAllArticles,
  listApprovedArticles,
  listPendingRevisions,
  listRevisions,
  setRevisionDecision,
  writeArticle,
} from "../lib/articles.js";
import { citationsFromFields, parseCitations } from "../lib/citations.js";
import { articleMatchesTheme, findGaps } from "../lib/gaps.js";
import { buildGraph, filterArticles, neighborhood } from "../lib/graph.js";
import { listApiKeys } from "../lib/keys.js";
import { articleDiensten, articleTags } from "../lib/links.js";
import { parseStoredMetadata } from "../lib/metadata.js";
import {
  articleMarkdown,
  llmsTxt,
  openApiJson,
  robotsTxt,
  rssXml,
  sitemapXml,
} from "../lib/seo.js";
import { clearAdminCookie, createAdminCookie, isAdminSession } from "../lib/session.js";
import { slugify } from "../lib/slug.js";
import { kolomById, KOLOMMEN } from "../lib/taxonomy.js";
import { listPendingVocab, listVocab, setVocabDecision } from "../lib/vocab.js";
import { findActiveApiKey, requireAuth, requireTier } from "../middleware/auth.js";
import { dbAll } from "../db.js";
import type { ArticleRow, RevisionRow } from "../types.js";
import {
  accessPage,
  adminDashboard,
  adminLoginPage,
  articlePage,
  contributePage,
  type ContributeOptions,
  type ContributeValues,
  dienstPage,
  errorPage,
  gapsPage,
  graphPage,
  homePage,
  notFoundPage,
  privacyPage,
  tagPage,
  themePage,
} from "../views/templates.js";

function html(reply: FastifyReply, status: number, body: string): FastifyReply {
  return reply.code(status).header("content-type", "text/html; charset=utf-8").send(body);
}

/** Fastify heeft geen serializer voor XML; een Buffer gaat als ruwe bytes. */
function xml(reply: FastifyReply, body: string, contentType: string): FastifyReply {
  return reply.header("content-type", contentType).send(Buffer.from(body, "utf8"));
}

function readString(body: unknown, key: string): string {
  if (!body || typeof body !== "object") {
    return "";
  }
  const value = (body as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}

function readStringList(body: unknown, key: string): string[] {
  if (!body || typeof body !== "object") {
    return [];
  }
  const value = (body as Record<string, unknown>)[key];
  if (Array.isArray(value)) {
    return value.map((item) => (typeof item === "string" ? item : ""));
  }
  if (typeof value === "string" && value) {
    return [value];
  }
  return [];
}

function readSources(body: unknown): string {
  const hidden = readString(body, "bronnen");
  const fromFields = citationsFromFields(readStringList(body, "bron_naam"), readStringList(body, "bron_url"));
  return (hidden.trim() || fromFields).trim();
}

function requireAdminPage(request: FastifyRequest, reply: FastifyReply): boolean {
  if (isAdminSession(request.headers.cookie)) {
    return true;
  }
  html(reply, 401, adminLoginPage());
  return false;
}

async function contributeOptions(): Promise<ContributeOptions> {
  const [categories, tags, articles] = await Promise.all([
    listVocab("category"),
    listVocab("tag"),
    listApprovedArticles(),
  ]);
  return {
    categories: categories.map((item) => item.label),
    tags: tags.map((item) => item.label),
    diensten: KOLOMMEN.map((item) => item.label),
    mentions: articles.map((article) => ({
      kind: "artikel",
      label: article.title,
      insert: `@[${article.title}]`,
    })),
  };
}

async function contributeView(reply: FastifyReply, status: number, values: ContributeValues): Promise<FastifyReply> {
  return html(reply, status, contributePage(values, await contributeOptions()));
}

export async function registerWikiRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", async (request, reply) => {
    try {
      const query = typeof request.query === "object" && request.query ? (request.query as Record<string, string>) : {};
      const q = (query.q ?? "").trim();
      const articles = await listApprovedArticles(q || undefined);
      const notice = query.geplaatst === "1" ? "Je bijdrage staat klaar voor keuring. Zodra die goedgekeurd is, komt hij live." : undefined;
      return html(reply, 200, homePage(articles, q, notice));
    } catch (error) {
      request.log.error({ err: error }, "Homepagina mislukt");
      return html(reply, 500, errorPage("Het overzicht kon niet worden geladen."));
    }
  });

  app.get("/wiki/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      if (id.endsWith(".md")) {
        const article = await getApprovedArticle(id.slice(0, -3));
        if (!article) {
          return reply.code(404).header("content-type", "text/plain; charset=utf-8").send("Niet gevonden");
        }
        return reply
          .header("content-type", "text/markdown; charset=utf-8")
          .header("x-robots-tag", "index, follow")
          .send(articleMarkdown(article));
      }
      const article = await getApprovedArticle(id);
      if (!article) {
        return html(reply, 404, notFoundPage());
      }
      const [revisions, articles] = await Promise.all([listRevisions(article.id), listApprovedArticles()]);
      const query = request.query as Record<string, string>;
      const notice = query.ok === "koppel" ? "De koppeling wacht op keuring." : query.ok === "bijdrage" ? "Je wijziging wacht op keuring." : undefined;
      return html(
        reply,
        200,
        articlePage(article, revisions, neighborhood(article, articles), articles, buildGraph(articles), notice),
      );
    } catch (error) {
      request.log.error({ err: error }, "Artikelweergave mislukt");
      return html(reply, 500, errorPage("Dit artikel kon niet worden getoond."));
    }
  });

  app.post("/wiki/:id/koppel", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const article = await getApprovedArticle(id);
      const targetSlug = readString(request.body, "target");
      const target = targetSlug ? await getApprovedArticle(targetSlug) : undefined;
      if (!article || !target) {
        return html(reply, 404, notFoundPage("Dit artikel of de koppeling bestaat niet."));
      }
      if (article.slug === target.slug) {
        return html(reply, 400, errorPage("Je kunt een artikel niet aan zichzelf koppelen."));
      }
      const mention = `@[${target.title}]`;
      const already = article.body.includes(mention) || article.body.includes(`[[${target.title}]]`);
      if (already) {
        return reply.redirect(`/wiki/${encodeURIComponent(article.slug)}`, 303);
      }
      const meta = parseStoredMetadata(article.metadata);
      await writeArticle(
        {
          title: article.title,
          category: article.category,
          summary: article.summary,
          body: `${article.body.trim()}\n\n${mention}`,
          slug: article.slug,
          contributorName: "koppeling",
          contributorNote: `Koppeling naar ${target.title}`,
          dienst: article.dienst,
          tags: articleTags(article).join(", "),
          bronnen: meta.bronnen ?? "",
          aiOrigin: meta.ai ?? "mens",
        },
        false,
      );
      return reply.redirect(`/wiki/${encodeURIComponent(article.slug)}?ok=koppel`, 303);
    } catch (error) {
      request.log.error({ err: error }, "Koppelen mislukt");
      return html(reply, 500, errorPage("De koppeling kon niet worden opgeslagen."));
    }
  });

  app.get("/bijdragen", async (request, reply) => {
    try {
      const query = request.query as Record<string, string>;
      const slug = (query.slug ?? "").trim();
      const title = (query.title ?? "").trim();
      const modus = query.modus === "aanpassen" || query.modus === "aanvullen" ? query.modus : slug ? "aanpassen" : "nieuw";
      const existing = slug ? await getArticleByAny(slug) : undefined;
      const meta = existing ? parseStoredMetadata(existing.metadata) : {};
      const locked = query.vast === "1" || Boolean(existing) || Boolean(title && slug);
      let body = existing?.body;
      if (modus === "aanvullen" && existing?.body) {
        body = `${existing.body.trim()}\n\n`;
      }
      return contributeView(reply, 200, {
        slug: existing?.slug || slug,
        title: existing?.title || title,
        category: existing?.category,
        dienst: existing ? articleDiensten(existing)[0] ?? "" : "",
        summary: existing?.summary,
        body,
        tags: existing ? articleTags(existing).join(", ") : "",
        bronnen: meta.bronnen,
        aiOrigin: meta.ai,
        locked,
        modus,
        notice: query.ok === "1" ? "Bedankt. Je tekst wacht op keuring." : undefined,
      });
    } catch (error) {
      request.log.error({ err: error }, "Bijdrageformulier mislukt");
      return html(reply, 500, errorPage("Het bijdrageformulier kon niet worden geopend."));
    }
  });

  app.post("/bijdragen", async (request, reply) => {
    const body = request.body;
    const vast = readString(body, "vast") === "1";
    const slug = readString(body, "slug");
    let title = readString(body, "title");
    let category = readString(body, "category");
    if (category === "__nieuw__") {
      category = readString(body, "category_new");
    }
    const articleBody = readString(body, "body");
    const bronnen = readSources(body);
    const aiOrigin = readString(body, "ai_origin");
    const dienst = readString(body, "dienst");
    const values: ContributeValues = {
      title,
      slug,
      category,
      body: articleBody,
      dienst,
      bronnen,
      aiOrigin,
      locked: vast,
      tags: readString(body, "tags"),
      summary: readString(body, "summary"),
      name: readString(body, "contributor_name"),
      note: readString(body, "contributor_note"),
      modus: readString(body, "modus") === "aanpassen" ? "aanpassen" : vast ? "aanvullen" : "nieuw",
    };
    try {
      if (vast && slug) {
        const existing = await getArticleByAny(slug);
        if (existing) {
          title = existing.title;
          values.title = title;
          values.slug = existing.slug;
        }
      }
      if (!title || !category || !articleBody.trim()) {
        return contributeView(reply, 400, { ...values, error: "Titel, categorie en tekst zijn verplicht." });
      }
      if (!dienst || !bronnen.trim() || !aiOrigin) {
        return contributeView(reply, 400, {
          ...values,
          error: "Kolom, bron en AI-herkomst zijn verplicht. Vul de naam van de bron en de link in.",
        });
      }
      if (parseCitations(bronnen).length === 0) {
        return contributeView(reply, 400, { ...values, error: "Vul minstens één bron in, met naam en bij voorkeur een link." });
      }
      const result = await writeArticle(
        {
          title,
          category,
          summary: readString(body, "summary"),
          body: articleBody,
          slug: slug || undefined,
          contributorName: readString(body, "contributor_name"),
          contributorNote: readString(body, "contributor_note"),
          dienst,
          tags: readString(body, "tags"),
          bronnen,
          aiOrigin,
        },
        false,
      );
      if (vast && result.article.slug) {
        return reply.redirect(`/wiki/${encodeURIComponent(result.article.slug)}?ok=bijdrage`, 303);
      }
      return reply.redirect("/?geplaatst=1", 303);
    } catch (error) {
      request.log.error({ err: error }, "Bijdrage opslaan mislukt");
      const message = error instanceof Error ? error.message : "Je bijdrage kon niet worden opgeslagen.";
      return contributeView(reply, 500, { ...values, error: message });
    }
  });

  app.get("/toegang", async (_request, reply) => html(reply, 200, accessPage()));
  app.get("/privacy", async (_request, reply) => html(reply, 200, privacyPage()));

  const kennisweb = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const articles = await listApprovedArticles();
      const query = request.query as Record<string, string>;
      return html(reply, 200, graphPage(buildGraph(articles), (query.focus ?? "").trim()));
    } catch (error) {
      request.log.error({ err: error }, "KennisWeb mislukt");
      return html(reply, 500, errorPage("KennisWeb kon niet worden getekend."));
    }
  };

  app.get("/kennisweb", kennisweb);
  app.get("/graaf", async (request, reply) => {
    const query = new URL(request.url, "http://local").search;
    return reply.redirect(`/kennisweb${query}`, 301);
  });
  app.get("/samenhang", async (request, reply) => {
    const query = new URL(request.url, "http://local").search;
    return reply.redirect(`/kennisweb${query}`, 301);
  });
  app.get("/kennisweb.json", async (_request, reply) => reply.send(buildGraph(await listApprovedArticles())));
  app.get("/graaf.json", async (_request, reply) => reply.send(buildGraph(await listApprovedArticles())));

  app.get("/aanvullen", async (request, reply) => {
    try {
      const articles = await listApprovedArticles();
      return html(reply, 200, gapsPage(findGaps(articles)));
    } catch (error) {
      request.log.error({ err: error }, "Aanvullen mislukt");
      return html(reply, 500, errorPage("Deze pagina kon niet worden geladen."));
    }
  });
  app.get("/leemtes", async (request, reply) => reply.redirect("/aanvullen", 301));

  app.get("/dienst/:id/:thema", async (request, reply) => {
    try {
      const { id, thema } = request.params as { id: string; thema: string };
      const kolom = kolomById(id) || KOLOMMEN.find((item) => slugify(item.label) === slugify(id));
      if (!kolom) {
        return html(reply, 404, notFoundPage("Deze kolom kennen we niet."));
      }
      const theme = kolom.themes.find((item) => item.slug === thema || slugify(item.title) === slugify(thema));
      if (!theme) {
        return html(reply, 404, notFoundPage("Dit thema kennen we niet."));
      }
      const inKolom = filterArticles(await listApprovedArticles(), { dienst: kolom.label });
      const articles = inKolom.filter((article) => articleMatchesTheme(article, theme));
      return html(reply, 200, themePage(kolom, theme, articles));
    } catch (error) {
      request.log.error({ err: error }, "Themapagina mislukt");
      return html(reply, 500, errorPage("Dit thema kon niet worden getoond."));
    }
  });

  app.get("/dienst/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const kolom = kolomById(id) || KOLOMMEN.find((item) => slugify(item.label) === slugify(id));
      if (!kolom) {
        return html(reply, 404, notFoundPage("Deze kolom kennen we niet."));
      }
      const articles = filterArticles(await listApprovedArticles(), { dienst: kolom.label });
      return html(reply, 200, dienstPage(kolom, articles));
    } catch (error) {
      request.log.error({ err: error }, "Kolompagina mislukt");
      return html(reply, 500, errorPage("Deze kolom kon niet worden getoond."));
    }
  });

  app.get("/tag/:tag", async (request, reply) => {
    try {
      const { tag } = request.params as { tag: string };
      const articles = filterArticles(await listApprovedArticles(), { tag });
      return html(reply, 200, tagPage(tag.replace(/-/g, " "), articles));
    } catch (error) {
      request.log.error({ err: error }, "Tagpagina mislukt");
      return html(reply, 500, errorPage("Deze tag kon niet worden getoond."));
    }
  });

  app.get("/beheer", async (request, reply) => {
    try {
      if (!requireAdminPage(request, reply)) {
        return;
      }
      const [pending, articles, keys, vocab] = await Promise.all([
        listPendingRevisions(),
        listAllArticles(),
        listApiKeys(),
        listPendingVocab(),
      ]);
      const query = request.query as Record<string, string>;
      return html(reply, 200, adminDashboard({ pending, articles, keys, vocab, notice: query.ok }));
    } catch (error) {
      request.log.error({ err: error }, "Beheerpagina mislukt");
      return html(reply, 500, errorPage("Beheer kon niet worden geladen."));
    }
  });

  app.post("/beheer/login", async (request, reply) => {
    try {
      const key = readString(request.body, "key");
      const found = key ? await findActiveApiKey(key) : null;
      if (!found || found.tier !== "admin") {
        return html(reply, 401, adminLoginPage("Deze sleutel is geen actieve beheerder."));
      }
      return reply.header("set-cookie", createAdminCookie()).redirect("/beheer", 303);
    } catch (error) {
      request.log.error({ err: error }, "Beheerlogin mislukt");
      return html(reply, 500, adminLoginPage("Aanmelden lukte niet."));
    }
  });

  app.post("/beheer/logout", async (_request, reply) => {
    return reply.header("set-cookie", clearAdminCookie()).redirect("/beheer", 303);
  });

  app.post("/beheer/beslissing", async (request, reply) => {
    try {
      if (!requireAdminPage(request, reply)) {
        return;
      }
      const revisionId = Number(readString(request.body, "revision_id"));
      const decision = readString(request.body, "decision");
      if (!Number.isFinite(revisionId) || (decision !== "approved" && decision !== "rejected")) {
        return html(reply, 400, errorPage("Ongeldige beoordeling."));
      }
      await setRevisionDecision(revisionId, decision);
      return reply.redirect(decision === "approved" ? "/beheer?ok=Bijdrage+goedgekeurd" : "/beheer?ok=Bijdrage+afgewezen", 303);
    } catch (error) {
      request.log.error({ err: error }, "Beoordeling mislukt");
      const message = error instanceof Error ? error.message : "Beoordeling mislukt.";
      return html(reply, 500, errorPage(message));
    }
  });

  app.post("/beheer/vocab", async (request, reply) => {
    try {
      if (!requireAdminPage(request, reply)) {
        return;
      }
      const vocabId = Number(readString(request.body, "vocab_id"));
      const decision = readString(request.body, "decision");
      if (!Number.isFinite(vocabId) || (decision !== "approved" && decision !== "rejected")) {
        return html(reply, 400, errorPage("Ongeldig voorstel."));
      }
      await setVocabDecision(vocabId, decision);
      return reply.redirect(decision === "approved" ? "/beheer?ok=Term+goedgekeurd" : "/beheer?ok=Term+afgewezen", 303);
    } catch (error) {
      request.log.error({ err: error }, "Vocab-beoordeling mislukt");
      const message = error instanceof Error ? error.message : "Beoordeling mislukt.";
      return html(reply, 500, errorPage(message));
    }
  });

  app.post("/beheer/artikel", async (request, reply) => {
    try {
      if (!requireAdminPage(request, reply)) {
        return;
      }
      await writeArticle(
        {
          title: readString(request.body, "title"),
          category: readString(request.body, "category"),
          summary: readString(request.body, "summary"),
          body: readString(request.body, "body"),
          slug: readString(request.body, "slug") || undefined,
          contributorName: "beheerder",
          contributorNote: "Direct gepubliceerd vanuit beheer",
          dienst: readString(request.body, "dienst"),
          tags: readString(request.body, "tags"),
          bronnen: readSources(request.body),
          aiOrigin: readString(request.body, "ai_origin"),
        },
        true,
      );
      return reply.redirect("/beheer?ok=Artikel+gepubliceerd", 303);
    } catch (error) {
      request.log.error({ err: error }, "Beheerpublicatie mislukt");
      const message = error instanceof Error ? error.message : "Publiceren mislukt.";
      return html(reply, 500, errorPage(message));
    }
  });

  app.get("/beheer/export.json", async (request, reply) => {
    try {
      if (!isAdminSession(request.headers.cookie)) {
        return reply.code(401).send({ error: "unauthorized" });
      }
      const [articles, revisions] = await Promise.all([
        dbAll<ArticleRow>("SELECT * FROM articles ORDER BY id ASC"),
        dbAll<RevisionRow>("SELECT * FROM article_revisions ORDER BY id ASC"),
      ]);
      return reply
        .header("content-disposition", 'attachment; filename="uniformwiki-export.json"')
        .send({ exported_at: new Date().toISOString(), articles, revisions });
    } catch (error) {
      request.log.error({ err: error }, "Export mislukt");
      return reply.code(500).send({ error: "export_failed" });
    }
  });

  app.get("/robots.txt", async (_request, reply) => {
    return reply.header("content-type", "text/plain; charset=utf-8").send(robotsTxt());
  });

  app.get("/sitemap.xml", async (request, reply) => {
    try {
      const articles = await listApprovedArticles();
      return xml(reply, sitemapXml(articles), "application/xml; charset=utf-8");
    } catch (error) {
      request.log.error({ err: error }, "Sitemap mislukt");
      return reply.code(500).type("text/plain; charset=utf-8").send("sitemap error");
    }
  });

  app.get("/llms.txt", async (_request, reply) => {
    const articles = await listApprovedArticles();
    return reply.header("content-type", "text/plain; charset=utf-8").send(llmsTxt(articles));
  });

  app.get("/feed.xml", async (_request, reply) => {
    const articles = await listApprovedArticles();
    return xml(reply, rssXml(articles), "application/rss+xml; charset=utf-8");
  });

  app.get("/openapi.json", async (_request, reply) => reply.send(openApiJson()));

  app.get("/api/wiki", async (request, reply) => {
    try {
      if (!(await requireAuth(request, reply))) {
        return;
      }
      const query = request.query as Record<string, string>;
      const articles = await listApprovedArticles(query.q, query.category);
      return reply.send({ articles: articles.map((article) => articlePublicJson(article)) });
    } catch (error) {
      request.log.error({ err: error }, "API-lijst mislukt");
      return reply.code(500).send({ error: "list_failed", message: "Artikelen konden niet worden opgehaald." });
    }
  });

  app.get("/api/wiki/:id", async (request, reply) => {
    try {
      if (!(await requireAuth(request, reply))) {
        return;
      }
      const { id } = request.params as { id: string };
      const article = await getApprovedArticle(id);
      if (!article) {
        return reply.code(404).send({ error: "not_found", message: "Artikel bestaat niet of is niet goedgekeurd." });
      }
      const revisions = await listRevisions(article.id);
      return reply.send(articlePublicJson(article, revisions));
    } catch (error) {
      request.log.error({ err: error }, "API-artikel mislukt");
      return reply.code(500).send({ error: "read_failed", message: "Artikel kon niet worden opgehaald." });
    }
  });

  app.post("/api/wiki", async (request, reply) => {
    try {
      const key = await requireTier(request, reply, ["mcp", "admin"]);
      if (!key) {
        return;
      }
      const body = (request.body ?? {}) as Record<string, unknown>;
      const title = typeof body.title === "string" ? body.title : "";
      const category = typeof body.category === "string" ? body.category : "";
      const articleBody = typeof body.body === "string" ? body.body : "";
      if (!title || !category || !articleBody.trim()) {
        return reply.code(400).send({ error: "invalid", message: "title, category en body zijn verplicht." });
      }
      const publish = key.tier === "admin" && body.publish === true;
      const result = await writeArticle(
        {
          title,
          category,
          summary: typeof body.summary === "string" ? body.summary : "",
          body: articleBody,
          slug: typeof body.slug === "string" ? body.slug : undefined,
          articleId: typeof body.article_id === "number" ? body.article_id : undefined,
          contributorName: typeof body.contributor_name === "string" ? body.contributor_name : key.label || key.tier,
          contributorNote: typeof body.contributor_note === "string" ? body.contributor_note : "",
          dienst: typeof body.dienst === "string" ? body.dienst : "",
          tags: typeof body.tags === "string" ? body.tags : "",
          bronnen:
            typeof body.bronnen === "string"
              ? body.bronnen
              : citationsFromFields(
                  Array.isArray(body.bron_naam) ? body.bron_naam.map(String) : typeof body.bron_naam === "string" ? [body.bron_naam] : [],
                  Array.isArray(body.bron_url) ? body.bron_url.map(String) : typeof body.bron_url === "string" ? [body.bron_url] : [],
                ),
          aiOrigin: typeof body.ai === "string" ? body.ai : typeof body.ai_origin === "string" ? body.ai_origin : "",
        },
        publish,
      );
      return reply.code(publish ? 201 : 202).send({
        status: result.article.status,
        created: result.created,
        article: articlePublicJson(result.article, [result.revision]),
      });
    } catch (error) {
      request.log.error({ err: error }, "API-schrijven mislukt");
      const message = error instanceof Error ? error.message : "Artikel kon niet worden opgeslagen.";
      return reply.code(500).send({ error: "write_failed", message });
    }
  });
}
