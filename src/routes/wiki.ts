import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { config } from "../config.js";
import {
  articlePublicJson,
  getApprovedArticle,
  getArticleByAny,
  listAllArticles,
  listApprovedArticles,
  listCategories,
  listPendingRevisions,
  listRevisions,
  setRevisionDecision,
  writeArticle,
} from "../lib/articles.js";
import { listApiKeys } from "../lib/keys.js";
import { clearAdminCookie, createAdminCookie, isAdminSession } from "../lib/session.js";
import { findActiveApiKey, requireAuth } from "../middleware/auth.js";
import { dbAll } from "../db.js";
import type { ArticleRow, RevisionRow } from "../types.js";
import {
  accessPage,
  adminDashboard,
  adminLoginPage,
  articlePage,
  contributePage,
  errorPage,
  homePage,
  notFoundPage,
} from "../views/templates.js";

function html(reply: FastifyReply, status: number, body: string): FastifyReply {
  return reply.code(status).header("content-type", "text/html; charset=utf-8").send(body);
}

function readString(body: unknown, key: string): string {
  if (!body || typeof body !== "object") {
    return "";
  }
  const value = (body as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}

function requireAdminPage(request: FastifyRequest, reply: FastifyReply): boolean {
  if (isAdminSession(request.headers.cookie)) {
    return true;
  }
  html(reply, 401, adminLoginPage());
  return false;
}

export async function registerWikiRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", async (request, reply) => {
    try {
      const query = typeof request.query === "object" && request.query ? (request.query as Record<string, string>) : {};
      const q = (query.q ?? "").trim();
      const category = (query.categorie ?? "").trim();
      const [categories, articles] = await Promise.all([
        listCategories(),
        listApprovedArticles(q || undefined, category || undefined),
      ]);
      const notice = query.geplaatst === "1" ? "Je bijdrage staat klaar voor keuring. Zodra die goedgekeurd is, komt hij live." : undefined;
      return html(reply, 200, homePage(categories, articles, q, notice));
    } catch (error) {
      request.log.error({ err: error }, "Homepagina mislukt");
      return html(reply, 500, errorPage("Het overzicht kon niet worden geladen."));
    }
  });

  app.get("/wiki/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const article = await getApprovedArticle(id);
      if (!article) {
        return html(reply, 404, notFoundPage());
      }
      const revisions = await listRevisions(article.id);
      return html(reply, 200, articlePage(article, revisions));
    } catch (error) {
      request.log.error({ err: error }, "Artikelweergave mislukt");
      return html(reply, 500, errorPage("Dit artikel kon niet worden getoond."));
    }
  });

  app.get("/bijdragen", async (request, reply) => {
    try {
      const query = request.query as Record<string, string>;
      const slug = (query.slug ?? "").trim();
      const existing = slug ? await getArticleByAny(slug) : undefined;
      return html(
        reply,
        200,
        contributePage({
          slug,
          title: existing?.title,
          category: existing?.category,
          summary: existing?.summary,
          body: existing ? existing.body : undefined,
          notice: query.ok === "1" ? "Bedankt. Je tekst wacht op keuring." : undefined,
        }),
      );
    } catch (error) {
      request.log.error({ err: error }, "Bijdrageformulier mislukt");
      return html(reply, 500, errorPage("Het bijdrageformulier kon niet worden geopend."));
    }
  });

  app.post("/bijdragen", async (request, reply) => {
    try {
      const body = request.body;
      const title = readString(body, "title");
      const category = readString(body, "category");
      const articleBody = readString(body, "body");
      if (!title || !category || !articleBody.trim()) {
        return html(reply, 400, contributePage({ title, category, body: articleBody, error: "Titel, categorie en tekst zijn verplicht." }));
      }
      await writeArticle(
        {
          title,
          category,
          summary: readString(body, "summary"),
          body: articleBody,
          slug: readString(body, "slug") || undefined,
          contributorName: readString(body, "contributor_name"),
          contributorNote: readString(body, "contributor_note"),
        },
        false,
      );
      return reply.redirect("/?geplaatst=1", 303);
    } catch (error) {
      request.log.error({ err: error }, "Bijdrage opslaan mislukt");
      const message = error instanceof Error ? error.message : "Je bijdrage kon niet worden opgeslagen.";
      return html(reply, 500, contributePage({ error: message }));
    }
  });

  app.get("/toegang", async (_request, reply) => {
    return html(reply, 200, accessPage());
  });

  app.get("/beheer", async (request, reply) => {
    try {
      if (!requireAdminPage(request, reply)) {
        return;
      }
      const [pending, articles, keys] = await Promise.all([
        listPendingRevisions(),
        listAllArticles(),
        listApiKeys(),
      ]);
      const query = request.query as Record<string, string>;
      return html(reply, 200, adminDashboard({ pending, articles, keys, notice: query.ok }));
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
    return reply
      .header("content-type", "text/plain; charset=utf-8")
      .send(`User-agent: *\nAllow: /\nDisallow: /beheer\nSitemap: ${config.publicBaseUrl}/sitemap.xml\n`);
  });

  app.get("/sitemap.xml", async (request, reply) => {
    try {
      const articles = await listApprovedArticles();
      const urls = [
        "/",
        "/bijdragen",
        "/toegang",
        ...articles.map((article) => `/wiki/${encodeURIComponent(article.slug)}`),
      ];
      const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
        .map((path) => `  <url><loc>${escapeXml(`${config.publicBaseUrl}${path}`)}</loc></url>`)
        .join("\n")}\n</urlset>\n`;
      return reply.header("content-type", "application/xml; charset=utf-8").send(body);
    } catch (error) {
      request.log.error({ err: error }, "Sitemap mislukt");
      return reply.code(500).send("sitemap error");
    }
  });

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
      const key = await requireAuth(request, reply);
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
      const asApproved = key.tier === "admin";
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
        },
        asApproved,
      );
      return reply.code(asApproved ? 201 : 202).send({
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

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
