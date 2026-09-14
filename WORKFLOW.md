# Cursor → GitHub → Bunny

Doel: in Cursor iets vragen, pushen, en de live app op Magic Containers bijwerken zonder handmatig Deploy.

```
Cursor
  → git push naar GitHub main
  → Actions bouwt linux/amd64
  → ghcr.io/meijer21/<app>:<sha>
  → Bunny rolling update
```

**Open in Cursor altijd de GitHub-repo** (`Meijer21/…`). Een losse “New Project”-kopie pusht naar Cursor-git; GitHub Actions en Bunny zien die commits niet.

## Eenmalig (heel account)

1. bunny.net → accountmenu → **API** → kopieer de account-key (geen sub-user).
2. GitHub → repo **Settings → Secrets and variables → Actions**:

| Type | Naam | Waarde |
| --- | --- | --- |
| Secret | `BUNNYNET_API_KEY` | die account-key |
| Variable | `BUNNY_APP_ID` | id uit `/magic-containers/apps/<id>/` |
| Variable (optioneel) | `BUNNY_IMAGE_REGISTRY_ID` | id van de ghcr.io-registry (`node scripts/bunny.mjs registries`) |

Zelfde `BUNNYNET_API_KEY` in elke nieuwe repo (of in een GitHub-organisatie als inherited secret). UniformWiki heeft als fallback-app-id `JvU6ASVcm2kmxOy`.

Zonder dat secret bouwt Actions wél de image; de pod blijft op de oude tag tot jij Deploy klikt of het secret zet.

## Elke wijziging (bestaande app)

1. Cursor: deze GitHub-repo open.
2. Vraag de agent om de feature. Die commit en pusht naar `main`.
3. Tab **Actions**: image + rolling update.
4. Live op `https://mc-….bunny.run` (en je CNAME als die goed staat).

Lokaal hetzelfde, als de key in je shell staat:

```bash
export BUNNYNET_API_KEY=…
node scripts/bunny.mjs apps
node scripts/bunny.mjs update-image --tag latest
```

## Nieuwe app (herhaalbaar)

Eerste image moet bestaan vóór Bunny kan starten. Volgorde:

1. Nieuwe **lege GitHub-repo**, public (of GHCR-package later public / PAT `read:packages` in Bunny).
2. In Cursor: **Clone from GitHub** die repo — dan is `origin` GitHub.
3. Agent bouwt de app + `Dockerfile` (`linux/amd64`, `GET /healthz`, poort ≠ 3000).
4. Kopieer uit deze repo:
   - `scripts/bunny.mjs`
   - `deploy/magic-container.json` (naam, image, poort, volume, regio `FR`)
   - `deploy/templates/github-deploy.yml` → `.github/workflows/deploy.yml` (vervang `JOUW-APP`)
   - optioneel `.github/workflows/provision.yml` en `.cursor/rules/bunny-deploy.mdc`
5. Secret `BUNNYNET_API_KEY` in de nieuwe repo. Push `main` → image staat op GHCR.
6. Actions → **Provision Magic Container**, of:

```bash
export BUNNYNET_API_KEY=…
# optioneel secrets voor de pod:
export BUNNY_ENV_ADMIN_API_KEY=…
node scripts/bunny.mjs provision
```

7. Plak het geprintte app-id in GitHub variable `BUNNY_APP_ID`. Daarna is elke `main`-push een rolling update.

Dashboard: `https://dash.bunny.net/magic-containers/apps/<id>/`

### Cursor-prompt voor een nieuwe app

Plak dit in een chat op de **nieuwe GitHub-repo**:

> Bouw een productie-app voor Bunny Magic Containers volgens het UniformWiki-speelboek (Meijer21/uniformwiki, WORKFLOW.md). Eén proces, Dockerfile linux/amd64, healthz, ongebruikelijke poort. Kopieer de deploy-workflow en scripts/bunny.mjs. Geen Anycast; CDN-endpoint; CNAME zonder Accelerate. Push naar GitHub main. Zeg welke GitHub secret/variable ik nog moet zetten.

## Domein (thisline.eu)

- Publiek: **CDN**-endpoint, niet Anycast.
- DNS: **plain CNAME** `wiki` → `mc-….bunny.run`. Zet DNS “CDN/Accelerate” **uit** — dat maakt een tweede pull zone en geeft **508 Loop Detected**.
- Hostname alleen op de Magic Container-pull zone. Shield op **die** zone, niet geërfd van the hoofdsite.
- Origin SSL uit, sticky uit, poort gelijk aan de containerpoort.

## Wat je niet doet

- GitHub als git-bron in Bunny koppelen — Bunny pult **images**.
- Anycast als publiek domein.
- Meerdere replica’s op SQLite.
- De API-key in de repo of in chatlogs plakken.

CLI-hulp: `node scripts/bunny.mjs help`
