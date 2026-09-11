# UniformWiki — projectuitleg

Samenvatting van wat er op 11 september 2026 is gebouwd, waarom het zo in elkaar zit, en hoe je het verder laat groeien.

## In één zin

UniformWiki is een lichte kennisbank over uniformen en beroepskleding: mensen lezen gewone webpagina’s, AI-agents halen dezelfde goedgekeurde teksten op via API en MCP, en jij verkoopt later toegang tot die machine-laag via FluentCart.

## Wat het probleem oplost

De meeste wiki’s zijn óf lastig om aan bij te dragen (Git, accounts, Markdown-editors) óf onbruikbaar voor AI-agents (alleen HTML, geen stabiele API). UniformWiki doet beide, zonder zware stack:

- Bezoekers en Google zien snelle, server-gerenderde pagina’s.
- Iedereen kan een artikel insturen via een formulier. Geen account, geen Git.
- Jij keurt bijdragen goed of af op één beheerpagina.
- Agents (Claude, Cursor, eigen tools) lezen alleen goedgekeurde artikelen, met een licentiesleutel.

De publieke wiki blijft open. Wat je later verkoopt is **programmatische toegang**, niet het lezen zelf.

## Wat er vandaag staat

Een werkende productieslice, live op Bunny Magic Containers:

1. **Publieke wiki** — homepage met categorieën en zoeken, artikelpagina’s met metadata en geschiedenis, sitemap en JSON-LD voor SEO.
2. **Bijdragen** — `/bijdragen` slaat alles op als `pending`. PII (geldig BSN, e-mail, Nederlands telefoonnummer) wordt automatisch uit de tekst gehaald vóór opslag.
3. **Beheer** — `/beheer` met de `ADMIN_API_KEY`: keuren, direct publiceren, licentiesleutels kopiëren, JSON-export (Bunny-volumes hebben geen backup).
4. **API** — `GET/POST /api/wiki` achter `Authorization: Bearer …`. Schrijven als gewone sleutel → `pending`. Schrijven als admin → meteen live.
5. **MCP** — `/api/v1/mcp` (huidige Streamable HTTP) plus legacy SSE op `/api/v1/mcp/messages`. Tools: `get_uniform_article` en `search_uniform_articles`.
6. **FluentCart-webhooks** — `order.completed` / `subscription.created` maakt of heractiveert `uw_live_…`. Annulering, mislukte betaling of refund zet de sleutel op `suspended`.
7. **Container** — twee-laags Alpine-image, SQLite op `/data`, GitHub Actions die `linux/amd64` naar GHCR pusht.

Er zitten drie startartikelen in (Welkom, Hoe je bijdraagt, Wat is een uniform?) zodat de site niet leeg opent.

## Techniek

Geen monorepo, geen React, geen ORM, geen database-cluster. Eén Node-proces.

| Laag | Keuze | Waarom |
| --- | --- | --- |
| Runtime | Node 22, Fastify, TypeScript (`NodeNext`) | Weinig RAM/CPU op Bunny |
| Data | SQLite3, WAL, bestand `/data/wiki.db` | Past op één persistent volume; later te tillen naar Bunny Database (libSQL) |
| HTML | Strings + Tailwind CDN | Geen CSS-build in de image |
| Auth | Bearer-sleutels in `api_keys` | Geen accountsysteem |
| Agents | `@modelcontextprotocol/sdk` v1 | Eén extra package, SSE én moderne clients |
| Image | `ghcr.io/meijer21/uniformwiki` | Bunny pult images, geen Git-repo |

### Datamodel

Drie tabellen:

- **articles** — slug, titel, categorie, samenvatting, body, metadata (JSON), status, `active_revision_id`
- **article_revisions** — elke inzending of publicatie, inclusief naam en toelichting van de bijdrager
- **api_keys** — `uw_live_…` of admin-sleutel, tier (`public_read` / `mcp` / `admin`), status (`active` / `suspended` / `revoked`), FluentCart-ids

Categorie is een veld op het artikel, geen extra tabel.

### Belangrijke paden

```
Browser / Google  →  GET /  en  GET /wiki/:id
Bijdrager         →  POST /bijdragen          →  status pending
Beheerder         →  /beheer                  →  approved + active_revision_id
Agent             →  Bearer + /api/wiki
                  →  Bearer + /api/v1/mcp
FluentCart        →  POST /webhooks/fluentcart
```

Poort: **43121**. Health: `GET /healthz`.

## Hosting (Bunny)

Magic Containers bouwt **niet** vanuit Git. De flow is:

1. Push naar `main` op [github.com/Meijer21/uniformwiki](https://github.com/Meijer21/uniformwiki)
2. GitHub Actions bouwt `linux/amd64` en pusht `ghcr.io/meijer21/uniformwiki:latest`
3. Bunny pult die image

In de app:

- **1 replica** — elk pod krijgt een eigen volume, anders splitst de wiki
- Volume op **`/data`**
- Env: `ADMIN_API_KEY`, `FLUENTCART_WEBHOOK_SECRET`, `SQLITE_PATH=/data/wiki.db`, `PUBLIC_BASE_URL`

Het GHCR-package moet public zijn (of Bunny heeft een PAT met `read:packages`). “GitHub koppelen” als git-bron is niet nodig.

Na een code-update: opnieuw deployen in Bunny tot er een Bunny API-key in GitHub Secrets staat (`BUNNYNET_API_KEY` + App ID). Dan kan de workflow de pod zelf bijwerken.

## Wat expres niet is meegenomen

Geen inloggen voor bijdragers, geen e-mail, geen Tailwind-compile, geen Postgres-client, geen tweede UI-library. Dat houdt de container klein en het beheer eenvoudig. Mail voor het doorsturen van licentiesleutels kan later; tot die tijd kopieer je ze onder Beheer.

## Verder bouwen

Logische volgende stappen, in die volgorde:

1. `PUBLIC_BASE_URL` op de echte Bunny-URL zetten (sitemap, Open Graph, MCP-tekst).
2. FluentCart-webhook naar `https://<host>/webhooks/fluentcart` met hetzelfde geheim.
3. Automatisch deployen vanuit Actions met Bunny-credentials.
4. Optioneel: sleutel mailen na aankoop, of Bunny Database i.p.v. het volume.

Lokaal: `cp .env.example .env && npm install && npm run dev` — zie [README.md](README.md).
