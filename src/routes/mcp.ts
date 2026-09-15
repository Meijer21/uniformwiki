import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import {
  articlePublicJson,
  getApprovedArticle,
  listApprovedArticles,
  listPendingRevisions,
  listRevisions,
  setRevisionDecision,
  writeArticle,
} from "../lib/articles.js";
import { serializeCitations } from "../lib/citations.js";
import { findGaps } from "../lib/gaps.js";
import { neighborhood } from "../lib/graph.js";
import { requireTier } from "../middleware/auth.js";
import type { ApiKeyRow } from "../types.js";

const sseSessions = new Map<string, SSEServerTransport>();

const sourceItem = z.object({
  name: z.string().min(1).describe("Naam van de bron"),
  url: z.string().url().optional().describe("https-link naar de bron"),
});

function createServer(key: ApiKeyRow): McpServer {
  const server = new McpServer({
    name: "uniformwiki",
    version: "1.0.0",
  });

  server.tool(
    "get_uniform_article",
    "Haal een goedgekeurd UniformWiki-artikel op via numeriek id of slug.",
    { article_id: z.string().min(1).describe("Artikel-id of slug") },
    async ({ article_id }) => {
      const article = await getApprovedArticle(article_id);
      if (!article) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: "not_found", message: `Geen goedgekeurd artikel voor '${article_id}'.` }) }],
          isError: true,
        };
      }
      const revisions = await listRevisions(article.id);
      return { content: [{ type: "text", text: JSON.stringify(articlePublicJson(article, revisions), null, 2) }] };
    },
  );

  server.tool(
    "search_uniform_articles",
    "Zoek goedgekeurde UniformWiki-artikelen op titel, samenvatting, tekst of categorie.",
    {
      query: z.string().min(1).describe("Zoekterm"),
      category: z.string().optional().describe("Optionele categoriefilter"),
    },
    async ({ query, category }) => {
      const articles = await listApprovedArticles(query, category);
      const compact = articles.slice(0, 25).map((article) => ({
        id: article.id,
        slug: article.slug,
        title: article.title,
        category: article.category,
        summary: article.summary,
      }));
      return { content: [{ type: "text", text: JSON.stringify({ count: compact.length, articles: compact }, null, 2) }] };
    },
  );

  server.tool(
    "get_related_articles",
    "Geef gerichte buren van een artikel: koppelingen, tags, kolom en terugverwijzingen.",
    { article_id: z.string().min(1).describe("Artikel-id of slug") },
    async ({ article_id }) => {
      const article = await getApprovedArticle(article_id);
      if (!article) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "not_found" }) }], isError: true };
      }
      const articles = await listApprovedArticles();
      return { content: [{ type: "text", text: JSON.stringify(neighborhood(article, articles), null, 2) }] };
    },
  );

  server.tool(
    "list_open_topics",
    "Thema’s en ontbrekende stukken die nog aangevuld mogen worden.",
    {},
    async () => {
      const articles = await listApprovedArticles();
      return { content: [{ type: "text", text: JSON.stringify({ gaps: findGaps(articles).slice(0, 40) }, null, 2) }] };
    },
  );

  server.tool(
    "submit_uniform_change",
    "Dien een nieuw artikel of een verbetering in. Bij een licentiesleutel blijft het verzoek pending tot keuring.",
    {
      title: z.string().min(1),
      body: z.string().min(1).describe("Platte tekst, lijsten en @[artikelnaam]"),
      category: z.string().min(1),
      dienst: z.string().min(1).describe("Brandweer, Ambulance, Politie, Defensie of Handhaving"),
      sources: z.array(sourceItem).min(1).describe("Bronnen: naam plus link"),
      ai_origin: z.enum(["mens", "ai-ondersteund", "ai-gegenereerd"]),
      summary: z.string().optional(),
      slug: z.string().optional(),
      tags: z.string().optional(),
      contributor_note: z.string().optional(),
    },
    async (args) => {
      const result = await writeArticle(
        {
          title: args.title,
          category: args.category,
          summary: args.summary ?? "",
          body: args.body,
          slug: args.slug,
          contributorName: key.label || key.tier,
          contributorNote: args.contributor_note ?? "",
          dienst: args.dienst,
          tags: args.tags ?? "",
          bronnen: serializeCitations(args.sources),
          aiOrigin: args.ai_origin,
        },
        false,
      );
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                status: result.article.status,
                message: "Verzoek ingediend. Het gaat live na keuring.",
                article: articlePublicJson(result.article, [result.revision]),
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  if (key.tier === "admin") {
    server.tool(
      "publish_uniform_article",
      "Publiceer direct een artikel of verbetering. Alleen voor de beheersleutel van THISLINE.",
      {
        title: z.string().min(1),
        body: z.string().min(1),
        category: z.string().min(1),
        dienst: z.string().min(1),
        sources: z.array(sourceItem).min(1),
        ai_origin: z.enum(["mens", "ai-ondersteund", "ai-gegenereerd"]),
        summary: z.string().optional(),
        slug: z.string().optional(),
        tags: z.string().optional(),
      },
      async (args) => {
        const result = await writeArticle(
          {
            title: args.title,
            category: args.category,
            summary: args.summary ?? "",
            body: args.body,
            slug: args.slug,
            contributorName: "beheer-agent",
            contributorNote: "Gepubliceerd via MCP-beheer",
            dienst: args.dienst,
            tags: args.tags ?? "",
            bronnen: serializeCitations(args.sources),
            aiOrigin: args.ai_origin,
          },
          true,
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ status: result.article.status, article: articlePublicJson(result.article, [result.revision]) }, null, 2),
            },
          ],
        };
      },
    );

    server.tool("list_pending_changes", "Toon verzoeken die op keuring wachten.", {}, async () => {
      const pending = await listPendingRevisions();
      return { content: [{ type: "text", text: JSON.stringify({ count: pending.length, pending }, null, 2) }] };
    });

    server.tool(
      "review_pending_change",
      "Keur een verzoek goed of wijs het af.",
      {
        revision_id: z.number().int().positive(),
        decision: z.enum(["approved", "rejected"]),
      },
      async ({ revision_id, decision }) => {
        await setRevisionDecision(revision_id, decision);
        return {
          content: [{ type: "text", text: JSON.stringify({ ok: true, revision_id, decision }) }],
        };
      },
    );
  }

  return server;
}

async function authorizeMcp(request: FastifyRequest, reply: FastifyReply): Promise<ApiKeyRow | null> {
  return requireTier(request, reply, ["mcp", "admin"]);
}

function applyCors(reply: FastifyReply): void {
  reply.header("access-control-allow-origin", "*");
  reply.header("access-control-allow-headers", "Authorization, Content-Type, Accept, Mcp-Session-Id");
  reply.header("access-control-allow-methods", "GET, POST, DELETE, OPTIONS");
}

export async function registerMcpRoutes(app: FastifyInstance): Promise<void> {
  app.options("/api/v1/mcp", async (_request, reply) => {
    applyCors(reply);
    return reply.code(204).send();
  });

  app.options("/api/v1/mcp/messages", async (_request, reply) => {
    applyCors(reply);
    return reply.code(204).send();
  });

  app.get("/api/v1/mcp", async (request, reply) => {
    applyCors(reply);
    try {
      const key = await authorizeMcp(request, reply);
      if (!key) {
        return;
      }
      reply.hijack();
      reply.raw.setHeader("access-control-allow-origin", "*");
      const transport = new SSEServerTransport("/api/v1/mcp/messages", reply.raw);
      sseSessions.set(transport.sessionId, transport);
      reply.raw.on("close", () => {
        sseSessions.delete(transport.sessionId);
      });
      const server = createServer(key);
      await server.connect(transport);
    } catch (error) {
      request.log.error({ err: error }, "MCP SSE-connectie mislukt");
      if (!reply.sent && !reply.raw.headersSent) {
        return reply.code(500).send({ error: "mcp_sse_failed" });
      }
    }
  });

  app.post("/api/v1/mcp/messages", async (request, reply) => {
    applyCors(reply);
    try {
      const key = await authorizeMcp(request, reply);
      if (!key) {
        return;
      }
      const query = request.query as { sessionId?: string };
      const sessionId = query.sessionId;
      if (!sessionId) {
        return reply.code(400).send({ error: "missing_session", message: "Queryparameter sessionId ontbreekt." });
      }
      const transport = sseSessions.get(sessionId);
      if (!transport) {
        return reply.code(400).send({ error: "unknown_session", message: "Onbekende MCP-sessie." });
      }
      reply.hijack();
      await transport.handlePostMessage(request.raw, reply.raw, request.body);
    } catch (error) {
      request.log.error({ err: error }, "MCP SSE-bericht mislukt");
      if (!reply.sent && !reply.raw.headersSent) {
        return reply.code(500).send({ error: "mcp_message_failed" });
      }
    }
  });

  app.post("/api/v1/mcp", async (request, reply) => {
    applyCors(reply);
    try {
      const key = await authorizeMcp(request, reply);
      if (!key) {
        return;
      }
      const server = createServer(key);
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      await server.connect(transport);
      reply.hijack();
      reply.raw.on("close", () => {
        void transport.close();
        void server.close();
      });
      await transport.handleRequest(request.raw, reply.raw, request.body);
    } catch (error) {
      request.log.error({ err: error }, "MCP Streamable HTTP mislukt");
      if (!reply.sent && !reply.raw.headersSent) {
        return reply.code(500).send({ error: "mcp_http_failed" });
      }
    }
  });

  app.delete("/api/v1/mcp", async (request, reply) => {
    applyCors(reply);
    try {
      if (!(await authorizeMcp(request, reply))) {
        return;
      }
      return reply.code(200).send({ ok: true });
    } catch (error) {
      request.log.error({ err: error }, "MCP-sessie sluiten mislukt");
      return reply.code(500).send({ error: "mcp_delete_failed" });
    }
  });
}
