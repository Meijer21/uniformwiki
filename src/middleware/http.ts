import type { FastifyInstance, FastifyRequest } from "fastify";
import { CONTRIBUTE_JS } from "../assets/contribute-js.js";
import { GRAPH_JS } from "../assets/graph-js.js";
import { THISLINE_CSS } from "../assets/thisline-css.js";
import { isIndexingBot } from "../lib/crawlers.js";
import { isProduction } from "../config.js";
import { isEuropeanCountry, requestCountryCode } from "../lib/europe.js";

const SKIP_GEO = new Set(["/healthz", "/robots.txt", "/sitemap.xml", "/llms.txt", "/feed.xml", "/openapi.json"]);

function clientIp(request: FastifyRequest): string {
  const forwarded = request.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  return request.ip || "unknown";
}

const hits = new Map<string, { count: number; reset: number }>();

function limited(ip: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const row = hits.get(ip);
  if (!row || now > row.reset) {
    hits.set(ip, { count: 1, reset: now + windowMs });
    return false;
  }
  row.count += 1;
  return row.count > max;
}

function europeBlockedPage(): string {
  return `<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>Alleen Europa</title>
<link rel="stylesheet" href="/assets/thisline.css">
</head>
<body><main class="shell site-main"><h1>Deze wiki is alleen in Europa te lezen.</h1>
<p class="lead">THISLINE houdt de hosting klein. Bezoek van buiten Europa laten we buiten.</p>
<p><a href="https://thisline.eu">thisline.eu</a></p></main></body></html>`;
}

export function registerHttpGuards(app: FastifyInstance): void {
  app.get("/assets/thisline.css", async (_request, reply) => {
    return reply
      .header("content-type", "text/css; charset=utf-8")
      .header("cache-control", "public, max-age=3600, stale-while-revalidate=86400")
      .send(THISLINE_CSS);
  });

  app.get("/assets/graph.js", async (_request, reply) => {
    return reply
      .header("content-type", "application/javascript; charset=utf-8")
      .header("cache-control", "public, max-age=3600, stale-while-revalidate=86400")
      .send(GRAPH_JS);
  });

  app.get("/assets/contribute.js", async (_request, reply) => {
    return reply
      .header("content-type", "application/javascript; charset=utf-8")
      .header("cache-control", "public, max-age=3600, stale-while-revalidate=86400")
      .send(CONTRIBUTE_JS);
  });

  app.addHook("onRequest", async (request, reply) => {
    const path = request.url.split("?")[0];

    reply.header("x-content-type-options", "nosniff");
    reply.header("x-frame-options", "DENY");
    reply.header("referrer-policy", "no-referrer");
    reply.header("permissions-policy", "camera=(), microphone=(), geolocation=(), payment=()");
    reply.header("cross-origin-opener-policy", "same-origin");
    reply.header("x-dns-prefetch-control", "off");
    if (isProduction()) {
      reply.header("strict-transport-security", "max-age=15552000; includeSubDomains");
    }
    reply.header(
      "content-security-policy",
      [
        "default-src 'self'",
        "img-src 'self' data:",
        "style-src 'self' https://fonts.bunny.net",
        "font-src https://fonts.bunny.net",
        "script-src 'self'",
        "connect-src 'self'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join("; "),
    );

    if (!SKIP_GEO.has(path) && !path.startsWith("/assets/") && !isIndexingBot(request.headers["user-agent"])) {
      const country = requestCountryCode(request.headers as Record<string, unknown>);
      if (country && country !== "XX" && !isEuropeanCountry(country)) {
        return reply
          .code(451)
          .header("cache-control", "public, s-maxage=3600")
          .header("content-type", "text/html; charset=utf-8")
          .send(europeBlockedPage());
      }
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      const cap = path.startsWith("/api") || path.startsWith("/webhooks") ? 60 : 20;
      if (limited(`${clientIp(request)}:${path}`, cap, 60_000)) {
        return reply.code(429).send({ error: "rate_limited", message: "Te veel verzoeken. Wacht even." });
      }
    }
  });

  app.addHook("onSend", async (request, reply, payload) => {
    const path = request.url.split("?")[0];
    if (reply.hasHeader("cache-control")) {
      return payload;
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      reply.header("cache-control", "no-store");
      return payload;
    }
    if (path === "/healthz" || path.startsWith("/beheer") || path.startsWith("/api")) {
      reply.header("cache-control", "no-store");
      return payload;
    }
    if (path.startsWith("/assets/")) {
      reply.header("cache-control", "public, max-age=3600, stale-while-revalidate=86400");
      return payload;
    }
    reply.header("cache-control", "public, s-maxage=120, stale-while-revalidate=600");
    reply.header("vary", "Accept-Encoding, CDN-RequestCountryCode");
    return payload;
  });
}
