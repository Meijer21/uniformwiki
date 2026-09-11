import Fastify from "fastify";
import formbody from "@fastify/formbody";
import { config } from "./config.js";
import { closeDb, initDb } from "./db.js";
import { registerMcpRoutes } from "./routes/mcp.js";
import { registerWebhookRoutes } from "./routes/webhooks.js";
import { registerWikiRoutes } from "./routes/wiki.js";

const app = Fastify({
  logger: true,
  trustProxy: true,
  bodyLimit: 1_048_576,
});

app.addContentTypeParser("application/json", { parseAs: "string" }, (request, body, done) => {
  const raw = typeof body === "string" ? body : Buffer.isBuffer(body) ? body.toString("utf8") : "";
  request.rawBody = raw;
  if (!raw) {
    done(null, {});
    return;
  }
  try {
    done(null, JSON.parse(raw) as unknown);
  } catch (error) {
    done(error as Error, undefined);
  }
});

await app.register(formbody);

app.setErrorHandler((error, request, reply) => {
  request.log.error({ err: error }, "Onverwachte fout");
  if (reply.sent) {
    return;
  }
  const wantsHtml = String(request.headers.accept ?? "").includes("text/html");
  if (wantsHtml) {
    reply.code(500).header("content-type", "text/html; charset=utf-8").send(
      `<!doctype html><html lang="nl"><body><h1>Er ging iets mis</h1><p>Probeer het later opnieuw.</p></body></html>`,
    );
    return;
  }
  reply.code(500).send({ error: "internal_error", message: "Onverwachte serverfout." });
});

app.get("/healthz", async () => ({
  ok: true,
  service: "uniformwiki",
  time: new Date().toISOString(),
}));

try {
  await initDb();
  await registerWikiRoutes(app);
  await registerWebhookRoutes(app);
  await registerMcpRoutes(app);

  await app.listen({ host: config.host, port: config.port });
  app.log.info(`UniformWiki luistert op http://${config.host}:${config.port}`);
} catch (error) {
  app.log.error({ err: error }, "Starten mislukt");
  await closeDb().catch(() => undefined);
  process.exit(1);
}

const shutdown = async (signal: string): Promise<void> => {
  app.log.info({ signal }, "Afsluiten");
  try {
    await app.close();
    await closeDb();
  } catch (error) {
    app.log.error({ err: error }, "Afsluiten mislukt");
    process.exit(1);
  }
  process.exit(0);
};

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});
process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
