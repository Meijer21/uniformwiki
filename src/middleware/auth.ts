import type { FastifyReply, FastifyRequest } from "fastify";
import { dbGet, dbRun } from "../db.js";
import { timingSafeEqualString } from "../lib/crypto.js";
import type { ApiKeyRow, ApiKeyTier } from "../types.js";

function extractBearer(header: string | string[] | undefined): string | null {
  const value = Array.isArray(header) ? header[0] : header;
  if (!value) {
    return null;
  }
  const match = value.match(/^Bearer\s+(\S+)$/i);
  return match ? match[1] : null;
}

export async function findActiveApiKey(provided: string): Promise<ApiKeyRow | null> {
  const row = await dbGet<ApiKeyRow>(
    `SELECT * FROM api_keys
     WHERE key = ?
       AND status = 'active'
       AND (expires_at IS NULL OR expires_at > datetime('now'))`,
    [provided],
  );
  if (!row || !timingSafeEqualString(row.key, provided)) {
    return null;
  }
  return row;
}

export async function authenticateRequest(request: FastifyRequest): Promise<ApiKeyRow | null> {
  const token = extractBearer(request.headers.authorization);
  if (!token) {
    return null;
  }
  const key = await findActiveApiKey(token);
  if (!key) {
    return null;
  }
  try {
    await dbRun("UPDATE api_keys SET last_used_at = datetime('now') WHERE id = ?", [key.id]);
  } catch (error) {
    request.log.warn({ err: error }, "Kon last_used_at niet bijwerken");
  }
  return key;
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<ApiKeyRow | null> {
  try {
    const key = await authenticateRequest(request);
    if (!key) {
      await reply.code(401).send({
        error: "unauthorized",
        message: "Geldige Authorization: Bearer <key> ontbreekt, is inactief of is verlopen.",
      });
      return null;
    }
    request.apiKey = key;
    return key;
  } catch (error) {
    request.log.error({ err: error }, "Authenticatie mislukt");
    await reply.code(500).send({ error: "auth_failed", message: "Authenticatie kon niet worden gecontroleerd." });
    return null;
  }
}

export async function requireTier(
  request: FastifyRequest,
  reply: FastifyReply,
  allowed: ApiKeyTier[],
): Promise<ApiKeyRow | null> {
  const key = await requireAuth(request, reply);
  if (!key) {
    return null;
  }
  if (!allowed.includes(key.tier)) {
    await reply.code(403).send({
      error: "forbidden",
      message: `Deze sleutel (${key.tier}) mag deze actie niet uitvoeren.`,
    });
    return null;
  }
  return key;
}
