import { dbAll, dbGet, dbRun } from "../db.js";
import { generateLiveApiKey, keyPrefix } from "./crypto.js";
import type { ApiKeyRow } from "../types.js";

export interface IssueKeyInput {
  email?: string;
  customerId?: string;
  orderId?: string;
  subscriptionId?: string;
  label?: string;
}

function matchClauses(input: IssueKeyInput): { sql: string; params: unknown[] } | null {
  if (input.subscriptionId) {
    return { sql: "fluentcart_subscription_id = ?", params: [input.subscriptionId] };
  }
  if (input.customerId) {
    return { sql: "fluentcart_customer_id = ?", params: [input.customerId] };
  }
  if (input.email) {
    return { sql: "customer_email = ?", params: [input.email.toLowerCase()] };
  }
  return null;
}

export async function issueOrReactivateMcpKey(input: IssueKeyInput): Promise<{
  key: ApiKeyRow;
  created: boolean;
  action: "issued" | "reactivated";
}> {
  const match = matchClauses(input);
  if (match) {
    const existing = await dbGet<ApiKeyRow>(
      `SELECT * FROM api_keys WHERE tier = 'mcp' AND ${match.sql} ORDER BY id DESC`,
      match.params,
    );
    if (existing) {
      await dbRun(
        `UPDATE api_keys
         SET status = 'active',
             expires_at = NULL,
             customer_email = COALESCE(?, customer_email),
             fluentcart_customer_id = COALESCE(?, fluentcart_customer_id),
             fluentcart_order_id = COALESCE(?, fluentcart_order_id),
             fluentcart_subscription_id = COALESCE(?, fluentcart_subscription_id),
             label = CASE WHEN label = '' THEN ? ELSE label END
         WHERE id = ?`,
        [
          input.email?.toLowerCase() ?? null,
          input.customerId ?? null,
          input.orderId ?? null,
          input.subscriptionId ?? null,
          input.label ?? "FluentCart-licentie",
          existing.id,
        ],
      );
      const updated = await dbGet<ApiKeyRow>("SELECT * FROM api_keys WHERE id = ?", [existing.id]);
      if (!updated) {
        throw new Error("Sleutel kon niet worden heractiveerd.");
      }
      return { key: updated, created: false, action: "reactivated" };
    }
  }

  const raw = generateLiveApiKey();
  const inserted = await dbRun(
    `INSERT INTO api_keys (
       key, key_prefix, label, tier, status, expires_at,
       customer_email, fluentcart_customer_id, fluentcart_order_id, fluentcart_subscription_id
     ) VALUES (?, ?, ?, 'mcp', 'active', NULL, ?, ?, ?, ?)`,
    [
      raw,
      keyPrefix(raw),
      input.label ?? "FluentCart-licentie",
      input.email?.toLowerCase() ?? null,
      input.customerId ?? null,
      input.orderId ?? null,
      input.subscriptionId ?? null,
    ],
  );
  const created = await dbGet<ApiKeyRow>("SELECT * FROM api_keys WHERE id = ?", [inserted.lastID]);
  if (!created) {
    throw new Error("Sleutel kon niet worden aangemaakt.");
  }
  return { key: created, created: true, action: "issued" };
}

export async function suspendMatchingKeys(input: IssueKeyInput): Promise<number> {
  const match = matchClauses(input);
  if (!match) {
    return 0;
  }
  const result = await dbRun(
    `UPDATE api_keys SET status = 'suspended' WHERE tier = 'mcp' AND ${match.sql} AND status != 'revoked'`,
    match.params,
  );
  return result.changes;
}

export async function listApiKeys(): Promise<ApiKeyRow[]> {
  return dbAll<ApiKeyRow>("SELECT * FROM api_keys ORDER BY created_at DESC");
}
