import type { FastifyInstance } from "fastify";
import { config } from "../config.js";
import { classifyFluentcartEvent, parseFluentcartEvent, verifyFluentcartSignature } from "../lib/fluentcart.js";
import { issueOrReactivateMcpKey, suspendMatchingKeys } from "../lib/keys.js";

function headerValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

export async function registerWebhookRoutes(app: FastifyInstance): Promise<void> {
  app.post("/webhooks/fluentcart", async (request, reply) => {
    try {
      if (!config.fluentcartSecret) {
        return reply.code(503).send({
          ok: false,
          error: "webhook_unconfigured",
          message: "FLUENTCART_WEBHOOK_SECRET ontbreekt.",
        });
      }

      const raw = request.rawBody;
      if (typeof raw !== "string" || raw.length === 0) {
        return reply.code(400).send({ ok: false, error: "empty_body" });
      }

      const signature = headerValue(request.headers["x-fluentcart-signature"]);
      if (!verifyFluentcartSignature(raw, signature, config.fluentcartSecret)) {
        return reply.code(401).send({ ok: false, error: "invalid_signature" });
      }

      const headerEvent = headerValue(request.headers["x-fluentcart-event"]);
      const identity = parseFluentcartEvent(request.body, headerEvent);
      const action = classifyFluentcartEvent(identity.event);

      if (action === "ignore") {
        return reply.send({ ok: true, action: "ignored", event: identity.event });
      }

      if (action === "suspend") {
        const changes = await suspendMatchingKeys({
          email: identity.email,
          customerId: identity.customerId,
          orderId: identity.orderId,
          subscriptionId: identity.subscriptionId,
        });
        return reply.send({
          ok: true,
          action: "suspended",
          event: identity.event,
          keys_updated: changes,
        });
      }

      const issued = await issueOrReactivateMcpKey({
        email: identity.email,
        customerId: identity.customerId,
        orderId: identity.orderId,
        subscriptionId: identity.subscriptionId,
        label: identity.email ? `FluentCart ${identity.email}` : "FluentCart-licentie",
      });

      return reply.send({
        ok: true,
        action: issued.action,
        event: identity.event,
        key_prefix: issued.key.key_prefix,
        customer_email: issued.key.customer_email,
      });
    } catch (error) {
      request.log.error({ err: error }, "FluentCart-webhook mislukt");
      return reply.code(500).send({ ok: false, error: "webhook_failed" });
    }
  });
}
