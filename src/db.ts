import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import sqlite3 from "sqlite3";
import { config } from "./config.js";
import { keyPrefix } from "./lib/crypto.js";
import { metadataToJson } from "./lib/metadata.js";
import type { ApiKeyRow, ArticleRow, RevisionRow } from "./types.js";

let db: sqlite3.Database | null = null;

function requireDb(): sqlite3.Database {
  if (!db) {
    throw new Error("Database is nog niet geïnitialiseerd.");
  }
  return db;
}

export function dbGet<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
  return new Promise((resolvePromise, reject) => {
    requireDb().get(sql, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolvePromise(row as T | undefined);
    });
  });
}

export function dbAll<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  return new Promise((resolvePromise, reject) => {
    requireDb().all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolvePromise((rows ?? []) as T[]);
    });
  });
}

export function dbRun(sql: string, params: unknown[] = []): Promise<{ lastID: number; changes: number }> {
  return new Promise((resolvePromise, reject) => {
    requireDb().run(sql, params, function onRun(err) {
      if (err) {
        reject(err);
        return;
      }
      resolvePromise({ lastID: this.lastID, changes: this.changes });
    });
  });
}

async function exec(sql: string): Promise<void> {
  await dbRun(sql);
}

const SEED_ARTICLES: Array<{
  slug: string;
  title: string;
  category: string;
  summary: string;
  body: string;
  metadata: Record<string, string>;
}> = [
  {
    slug: "welkom-bij-uniformwiki",
    title: "Welkom bij UniformWiki",
    category: "Over",
    summary: "Wat UniformWiki is, voor wie het is, en hoe mensen én AI-agents dezelfde kennis gebruiken.",
    body: `UniformWiki is een lichte kennisbank over kledingvoorschriften, beroepskleding en uniformen. Artikelen zijn bedoeld voor twee lezers tegelijk: mensen die via Google of een bladwijzer binnenkomen, en AI-agents die via de API of MCP dezelfde goedgekeurde tekst opvragen.

## Wat je hier vindt

- Uitleg van begrippen, materialen en voorschriften
- Praktische artikelen die je zonder account kunt verbeteren
- Een beheerpagina waarop bijdragen worden nagekeken voordat ze live gaan

## Wat je hier niet hoeft te doen

Je hoeft geen Git, Markdown-editor of account te installeren. Een titel, een categorie en je tekst zijn genoeg. Persoonsgegevens zoals BSN, e-mailadressen en telefoonnummers worden automatisch uit bijdragen gehaald.

## Voor uitgevers

Toegang voor agents verkoop je later als licentie via FluentCart. De wiki zelf blijft leesbaar, zodat zoekmachines en bezoekers niet achter een muur belanden.`,
    metadata: { licentie: "CC-BY-SA-4.0", trefwoorden: "uniformwiki, wiki, mcp" },
  },
  {
    slug: "hoe-je-bijdraagt",
    title: "Hoe je bijdraagt",
    category: "Over",
    summary: "Een bijdrage leveren zonder technische drempel: formulier, moderatie en wat er daarna gebeurt.",
    body: `Iedereen mag een artikel voorstellen of een bestaande pagina aanvullen. Je hebt geen account nodig.

## Nieuwe pagina

1. Open **Bijdragen** in het menu
2. Kies een duidelijke titel en een bestaande of nieuwe categorie
3. Schrijf in gewone taal. Koppen mag je markeren met \`#\`, \`##\` of \`###\`
4. Optioneel: zet bovenaan een metadata-blok

\`\`\`
---
bronnen: Inspectie SZW, 2024
licentie: CC-BY-SA-4.0
trefwoorden: hoge zichtbaarheid, EN ISO 20471
---
\`\`\`

## Wat er daarna gebeurt

Een beheerder ziet je tekst onder **Beheer**. Na goedkeuring wordt jouw versie de actieve pagina en blijft de oude versie in de geschiedenis staan. Afgewezen teksten verdwijnen niet: ze blijven zichtbaar in het logboek van die pagina.

## Bestaande pagina verbeteren

Gebruik dezelfde titel of slug als het artikel dat je wilt aanvullen. Je bijdrage wordt een nieuwe revisie en overschrijft niets totdat iemand hem goedkeurt.`,
    metadata: { licentie: "CC-BY-SA-4.0", trefwoorden: "bijdragen, moderatie" },
  },
  {
    slug: "wat-is-een-uniform",
    title: "Wat is een uniform?",
    category: "Begrippen",
    summary: "Een werkbare definitie: herkenbaarheid, voorschrift en het verschil met vrije beroepskleding.",
    body: `Een uniform is kleding die een organisatie voorschrijft zodat de drager herkenbaar is als onderdeel van die organisatie. Het gaat niet alleen om kleur of logo. Een uniform legt meestal vast welke onderdelen verplicht zijn, wanneer ze gedragen worden en wat er níet bij mag.

## Drie kenmerken

1. **Herkenbaarheid** — collega's, burgers of patiënten zien in één oogopslag de rol
2. **Voorschrift** — de werkgever of instantie bepaalt model, kleur en gebruik
3. **Gelijkheid** — binnen dezelfde functie ziet de kleding er bewust hetzelfde uit

## Wat het niet is

Bedrijfskleding zonder dwingend model (bijvoorbeeld “draag iets donkers”) is geen uniform. Een veiligheidshesje dat iedereen op de bouwplaats over de eigen jas trekt, is wél een voorgeschreven laag, maar nog geen volledig uniform.

## Waarom dit onderscheid telt

Regelgeving, cao-afspraken en vergoedingen hangen vaak af van dit verschil. Zet in artikelen daarom altijd of iets *verplicht model*, *verplichte laag* of *advies* is.`,
    metadata: { licentie: "CC-BY-SA-4.0", trefwoorden: "definitie, beroepskleding, voorschrift" },
  },
];

async function seedAdminKey(): Promise<void> {
  const adminKey = config.adminApiKey;
  if (!adminKey) {
    console.warn("ADMIN_API_KEY ontbreekt. Beheer is pas bruikbaar zodra je die zet.");
    return;
  }

  const existing = await dbGet<ApiKeyRow>("SELECT * FROM api_keys WHERE key = ?", [adminKey]);
  if (existing) {
    if (existing.status !== "active" || existing.tier !== "admin") {
      await dbRun(
        `UPDATE api_keys
         SET status = 'active', tier = 'admin', expires_at = NULL, label = 'Masterbeheerder'
         WHERE id = ?`,
        [existing.id],
      );
    }
    return;
  }

  await dbRun(
    `INSERT INTO api_keys (key, key_prefix, label, tier, status, expires_at)
     VALUES (?, ?, 'Masterbeheerder', 'admin', 'active', NULL)`,
    [adminKey, keyPrefix(adminKey)],
  );
}

async function seedArticles(): Promise<void> {
  const row = await dbGet<{ count: number }>("SELECT COUNT(*) AS count FROM articles");
  if ((row?.count ?? 0) > 0) {
    return;
  }

  for (const article of SEED_ARTICLES) {
    const created = await dbRun(
      `INSERT INTO articles (slug, title, category, summary, body, metadata, status)
       VALUES (?, ?, ?, ?, ?, ?, 'approved')`,
      [
        article.slug,
        article.title,
        article.category,
        article.summary,
        article.body,
        metadataToJson(article.metadata),
      ],
    );

    const revision = await dbRun(
      `INSERT INTO article_revisions (
         article_id, title, summary, body, metadata, category,
         contributor_name, contributor_note, status
       ) VALUES (?, ?, ?, ?, ?, ?, 'UniformWiki', 'Eerste versie', 'approved')`,
      [
        created.lastID,
        article.title,
        article.summary,
        article.body,
        metadataToJson(article.metadata),
        article.category,
      ],
    );

    await dbRun(
      `UPDATE articles SET active_revision_id = ?, updated_at = datetime('now') WHERE id = ?`,
      [revision.lastID, created.lastID],
    );
  }
}

export async function initDb(): Promise<void> {
  const absolute = resolve(config.sqlitePath);
  mkdirSync(dirname(absolute), { recursive: true });

  db = await new Promise<sqlite3.Database>((resolvePromise, reject) => {
    const instance = new sqlite3.Database(absolute, (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolvePromise(instance);
    });
  });

  await exec("PRAGMA journal_mode = WAL");
  await exec("PRAGMA foreign_keys = ON");
  await exec("PRAGMA busy_timeout = 5000");

  await exec(`
    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      summary TEXT NOT NULL DEFAULT '',
      body TEXT NOT NULL DEFAULT '',
      metadata TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected', 'archived')),
      active_revision_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await exec(`
    CREATE TABLE IF NOT EXISTS article_revisions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL DEFAULT '',
      body TEXT NOT NULL DEFAULT '',
      metadata TEXT NOT NULL DEFAULT '{}',
      category TEXT NOT NULL,
      contributor_name TEXT NOT NULL DEFAULT 'anoniem',
      contributor_note TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (article_id) REFERENCES articles(id)
    )
  `);

  await exec(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      key_prefix TEXT NOT NULL,
      label TEXT NOT NULL DEFAULT '',
      tier TEXT NOT NULL CHECK (tier IN ('public_read', 'mcp', 'admin')),
      status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'suspended', 'revoked')),
      expires_at TEXT,
      customer_email TEXT,
      fluentcart_customer_id TEXT,
      fluentcart_order_id TEXT,
      fluentcart_subscription_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_used_at TEXT
    )
  `);

  await exec("CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status)");
  await exec("CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category)");
  await exec("CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug)");
  await exec("CREATE INDEX IF NOT EXISTS idx_revisions_article ON article_revisions(article_id, created_at)");
  await exec("CREATE INDEX IF NOT EXISTS idx_api_keys_status ON api_keys(status, tier)");
  await exec("CREATE INDEX IF NOT EXISTS idx_api_keys_customer ON api_keys(customer_email)");
  await exec("CREATE INDEX IF NOT EXISTS idx_api_keys_subscription ON api_keys(fluentcart_subscription_id)");

  await seedAdminKey();
  await seedArticles();
}

export async function closeDb(): Promise<void> {
  const instance = db;
  db = null;
  if (!instance) {
    return;
  }
  await new Promise<void>((resolvePromise, reject) => {
    instance.close((err) => {
      if (err) {
        reject(err);
        return;
      }
      resolvePromise();
    });
  });
}

export type { ArticleRow, RevisionRow, ApiKeyRow };
