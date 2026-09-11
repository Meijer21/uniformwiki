# UniformWiki

Lichte kennisbank over uniformen en beroepskleding. Mensen lezen server-side HTML. AI-agents gebruiken dezelfde goedgekeurde teksten via REST en MCP. Gebouwd als één Fastify-proces voor Bunny Magic Containers.

## Wat je ermee doet

- Artikelen zoeken en lezen zonder account
- Verbeteringen insturen via `/bijdragen` — geen Git, geen editor
- Modereren op `/beheer` met `ADMIN_API_KEY`
- Licenties uit FluentCart omzetten in `uw_live_…`-sleutels voor MCP/API

De publieke wiki blijft open voor Google. Programmatische toegang (API en MCP) vraagt een actieve sleutel.

## Lokaal starten

Node 22+.

```bash
cp .env.example .env
npm install
npm run dev
```

Open [http://127.0.0.1:43121](http://127.0.0.1:43121). Beheer: plak de waarde van `ADMIN_API_KEY`.

Productie lokaal:

```bash
npm run build
npm start
```

## Omgeving

| Variabele | Functie |
| --- | --- |
| `PORT` | Standaard `43121` |
| `HOST` | Standaard `0.0.0.0` |
| `SQLITE_PATH` | SQLite-bestand. Lokaal `./data/wiki.db`, op Bunny `/data/wiki.db` |
| `ADMIN_API_KEY` | Masterbeheerder, wordt bij start in `api_keys` gezet |
| `FLUENTCART_WEBHOOK_SECRET` | HMAC-geheim voor webhooks |
| `PUBLIC_BASE_URL` | Canonieke site-URL voor sitemap en Open Graph |
| `SITE_NAME` | Weergavenaam, standaard UniformWiki |

## Bunny Magic Container

1. Bouw de image met de meegeleverde `Dockerfile` (twee Alpine-lagen).
2. Hang een **persistent volume** op `/data`. SQLite overleeft anders een herstart niet.
3. Draai **één replica**. Elk pod krijgt een eigen volume; meerdere replica’s splitsen de wiki.
4. Zet de env-variabelen hierboven. `SQLITE_PATH=/data/wiki.db` staat al in de image.
5. Healthcheck: `GET /healthz`.
6. Poort `43121`.

Bunny Database (libSQL) kun je later aansluiten door hetzelfde schema te houden en alleen de pad/URL in `src/db.ts` te wisselen. Die client zit er bewust nog niet in.

Volumes bij Bunny hebben geen automatische backup. Exporteer onder **Beheer → JSON-export**.

## FluentCart

Webhook-URL: `https://jouw-domein/webhooks/fluentcart`

Headers die we lezen:

- `X-FluentCart-Signature` — HMAC-SHA256 van de raw body, optioneel met `sha256=`-prefix
- `X-FluentCart-Event` — bijvoorbeeld `order.completed`

| Event | Actie |
| --- | --- |
| `order.completed`, `subscription.created` (en paid/activated/renewed) | MCP-sleutel aanmaken of heractiveren |
| `subscription.cancelled`, `payment.failed`, `order.refunded` | Sleutels van die klant op `suspended` |

De volledige sleutel staat onder Beheer. Stuur die naar de klant tot je later mail koppelt.

## MCP

- Streamable HTTP: `POST /api/v1/mcp`
- Legacy SSE: `GET /api/v1/mcp` en `POST /api/v1/mcp/messages`
- Header: `Authorization: Bearer uw_live_…` (tier `mcp` of `admin`)

Tools:

- `get_uniform_article` — `article_id` (id of slug)
- `search_uniform_articles` — `query`, optioneel `category`

REST voor agents: `GET/POST /api/wiki` met dezelfde Bearer-header. `public_read` en `mcp` schrijven naar `pending`. `admin` publiceert direct.

## Bijdragen zonder gedoe

1. Open **Bijdragen**
2. Vul titel, categorie en tekst in
3. Optioneel metadata-blok bovenaan:

```
---
bronnen: Inspectie SZW, 2024
licentie: CC-BY-SA-4.0
trefwoorden: hoge zichtbaarheid
---
```

4. Een beheerder keurt goed. De oude versie blijft in de geschiedenis.

PII (geldig BSN, e-mail, Nederlands telefoonnummer) wordt vóór elke schrijfactie uit artikeltekst gehaald.
