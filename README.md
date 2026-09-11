# UniformWiki

Lichte kennisbank over uniformen en beroepskleding. Mensen lezen server-side HTML. AI-agents gebruiken dezelfde goedgekeurde teksten via REST en MCP. Gebouwd als één Fastify-proces voor Bunny Magic Containers.

Uitleg van het project, de keuzes en wat er gebouwd is: [PROJECT.md](PROJECT.md).

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

Bunny bouwt **niet** vanuit je Git-repo. Je koppelt een **container-image**.
De image staat op GitHub Container Registry (geen GitHub-login nodig zolang het package public is):

`ghcr.io/meijer21/uniformwiki:latest`

1. Magic Containers → **Add App**.
2. **Add Container**
   - Registry: **GitHub Container Registry** (of “public / GitHub”)
   - Image: `meijer21/uniformwiki`
   - Tag: `latest`
   - Poort: `43121`
3. Persistent volume mount: **`/data`**
4. Eén replica (anders krijgt elke replica een lege eigen database).
5. Environment:
   - `ADMIN_API_KEY` — kies zelf een lange geheime sleutel
   - `FLUENTCART_WEBHOOK_SECRET`
   - `PUBLIC_BASE_URL` — jouw Bunny-URL, zonder slash aan het eind
   - `SQLITE_PATH=/data/wiki.db`
6. Endpoint/health: poort `43121`, pad `/healthz`.

Elke push naar `main` bouwt een nieuwe `linux/amd64`-image via GitHub Actions.
Probeer **niet** GitHub als git-bron of Image Registry te autoriseren — dat is niet nodig.

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
