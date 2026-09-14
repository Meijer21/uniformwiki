# Agent-instructies (UniformWiki / Bunny)

Nederlands tegen de gebruiker. Speelboek: [WORKFLOW.md](WORKFLOW.md).

## Doel van deze repo

Lichte Fastify-wiki op Bunny Magic Containers. Mensen: SSR-HTML. Agents: REST + MCP. Image: `ghcr.io/meijer21/uniformwiki`.

## Deploy

```
Cursor → git push naar GitHub main → Actions (linux/amd64) → GHCR → Bunny rolling update
```

Bunny-secret: GitHub `BUNNYNET_API_KEY`. App-id fallback: `JvU6ASVcm2kmxOy`, container `uniformwiki`.

CLI: `BUNNYNET_API_KEY=… node scripts/bunny.mjs apps|provision|update-image --tag <sha>`

Nieuwe apps: kopieer `deploy/templates/github-deploy.yml` en `scripts/bunny.mjs`. Open in Cursor altijd de GitHub-repo, niet een losse schaduwkopie.

## Niet doen

- GitHub als git-bron in Bunny koppelen
- Anycast als publiek domein
- CNAME met CDN-acceleration op hetzelfde hostname
- Meerdere replica’s op SQLite
- Secrets committen
