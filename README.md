# UniformWiki

Kennisbank van THISLINE voor brandweer, ambulance, politie, defensie en handhaving. Mensen lezen de pagina’s. Agents halen dezelfde goedgekeurde tekst op via REST en MCP.

Live: [wiki.thisline.eu](https://wiki.thisline.eu)

## Hoe je iets bijwerkt

Je hoeft Bunny niet open te klikken.

1. Zeg in Cursor wat er anders moet.
2. De agent zet het op GitHub `main`.
3. GitHub Actions bouwt de image en schuift de Magic Container door.
4. Na een paar minuten staat het live. Secret `BUNNYNET_API_KEY` staat al.

Dat is dezelfde flow als nu. Geen extra stappen, geen Shield-pakket van €10.

Europa-toegang (alleen wiki-pullzone, niet thisline.eu): GitHub Actions → **Lock wiki to Europe**.

Speelboek: [WORKFLOW.md](WORKFLOW.md).

## Wat je ermee doet

- Kolom kiezen, daarna thema, daarna artikel. Hoe dieper, hoe gerichter. Statische data, geen medailles.
- KennisWeb toont wat bij een thema hoort. Onder elk artikel kun je zelf koppelen.
- Aanvullen: wat nog ontbreekt. Aanpassen: bestaande stukken verbeteren.
- Elke pagina: bron met naam en klikbare link, plus of de tekst met AI is gemaakt.
- THISLINE-blokken voor Pulse, Front Line Cards en het platform. Geen verkochte advertenties.
- Bijdragen via `/bijdragen` zonder account. Beheer op `/beheer`.

Vindbaarheid: [sitemap.xml](https://wiki.thisline.eu/sitemap.xml), [llms.txt](https://wiki.thisline.eu/llms.txt), [feed.xml](https://wiki.thisline.eu/feed.xml). Elk artikel heeft ook een Markdown-variant (`/wiki/slug.md`).

Lettertypes via Bunny Fonts. Geen Google. Geen tracking.

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

Elke push naar GitHub `main` bouwt een `linux/amd64`-image. Met secret `BUNNYNET_API_KEY` volgt een rolling update op de Magic Container. Speelboek (Cursor, nieuwe apps, DNS): [WORKFLOW.md](WORKFLOW.md).

```bash
export BUNNYNET_API_KEY=…
npm run bunny -- apps
```

Probeer **niet** GitHub als git-bron in Bunny te koppelen — Bunny pult images.

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
- Header: `Authorization: Bearer …` (`mcp` = licentie, `admin` = beheer)

Licentie (`mcp`): lezen en verzoeken indienen (`submit_uniform_change`). Alles blijft pending tot keuring.

Beheer (`admin`, jouw `ADMIN_API_KEY`): ook `publish_uniform_article`, `list_pending_changes` en `review_pending_change`.

Verdere tools: `get_uniform_article`, `search_uniform_articles`, `get_related_articles`, `list_open_topics`.

REST: `GET/POST /api/wiki` met dezelfde Bearer-header. `mcp` schrijft naar `pending`. `admin` publiceert met `"publish": true`.

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
