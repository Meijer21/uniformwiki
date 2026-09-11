import { hmacSha256Hex, timingSafeEqualString } from "./crypto.js";

export interface FluentCartIdentity {
  event: string;
  email?: string;
  customerId?: string;
  orderId?: string;
  subscriptionId?: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function pickString(root: unknown, paths: string[][]): string | undefined {
  for (const path of paths) {
    let current: unknown = root;
    for (const key of path) {
      const record = asRecord(current);
      if (!record) {
        current = undefined;
        break;
      }
      current = record[key];
    }
    if (typeof current === "number" && Number.isFinite(current)) {
      return String(current);
    }
    if (typeof current === "string" && current.trim()) {
      return current.trim();
    }
  }
  return undefined;
}

export function normalizeFluentcartSignature(header: string): string {
  return header.replace(/^sha256=/i, "").trim();
}

export function verifyFluentcartSignature(rawBody: string, header: string | undefined, secret: string): boolean {
  if (!header || !secret) {
    return false;
  }
  const provided = normalizeFluentcartSignature(header);
  const expected = hmacSha256Hex(secret, rawBody);
  return timingSafeEqualString(provided, expected);
}

export function parseFluentcartEvent(body: unknown, headerEvent?: string): FluentCartIdentity {
  const event =
    headerEvent?.trim() ||
    pickString(body, [["event"], ["type"], ["name"], ["trigger"]]) ||
    "";

  const email = pickString(body, [
    ["customer", "email"],
    ["order", "customer", "email"],
    ["data", "customer", "email"],
    ["data", "order", "customer", "email"],
    ["email"],
    ["customer_email"],
  ]);

  const customerId = pickString(body, [
    ["customer", "id"],
    ["order", "customer", "id"],
    ["data", "customer", "id"],
    ["customer_id"],
    ["data", "subscription", "customer_id"],
    ["subscription", "customer_id"],
  ]);

  const orderId = pickString(body, [
    ["order", "id"],
    ["data", "order", "id"],
    ["order_id"],
    ["id"],
  ]);

  const subscriptionId = pickString(body, [
    ["subscription", "id"],
    ["data", "subscription", "id"],
    ["subscription_id"],
  ]);

  return { event, email, customerId, orderId, subscriptionId };
}

export function classifyFluentcartEvent(event: string): "grant" | "suspend" | "ignore" {
  const name = event.toLowerCase().replace(/[/_]/g, ".");
  if (
    name.includes("order.completed") ||
    name.includes("order.paid") ||
    name.includes("subscription.created") ||
    name.includes("subscription.activated") ||
    name.includes("subscription.renewed")
  ) {
    return "grant";
  }
  if (
    name.includes("subscription.cancelled") ||
    name.includes("subscription.canceled") ||
    name.includes("payment.failed") ||
    name.includes("order.refunded") ||
    name.includes("order.canceled") ||
    name.includes("order.cancelled")
  ) {
    return "suspend";
  }
  return "ignore";
}
