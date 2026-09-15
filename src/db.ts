import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import sqlite3 from "sqlite3";
import { config } from "./config.js";
import { keyPrefix } from "./lib/crypto.js";
import { mergeTagLists } from "./lib/links.js";
import { metadataToJson, parseStoredMetadata } from "./lib/metadata.js";
import { SEED_ARTICLES } from "./lib/seed.js";
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

async function migrateArticles(): Promise<void> {
  const cols = await dbAll<Record<string, unknown>>("PRAGMA table_info(articles)");
  const names = new Set(cols.map((col) => String(col.name ?? col.Name ?? "").toLowerCase()));
  if (!names.has("dienst")) {
    try {
      await exec("ALTER TABLE articles ADD COLUMN dienst TEXT NOT NULL DEFAULT ''");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/duplicate column/i.test(message)) {
        throw error;
      }
    }
  }
  const rows = await dbAll<ArticleRow>("SELECT * FROM articles WHERE dienst IS NULL OR dienst = ''");
  for (const row of rows) {
    const dienst = mergeTagLists(parseStoredMetadata(row.metadata).dienst, parseStoredMetadata(row.metadata).diensten);
    if (dienst) {
      await dbRun("UPDATE articles SET dienst = ? WHERE id = ?", [dienst, row.id]);
    }
  }
}

async function seedArticles(): Promise<void> {
  for (const article of SEED_ARTICLES) {
    const existing = await dbGet<ArticleRow>("SELECT * FROM articles WHERE slug = ?", [article.slug]);
    if (existing) {
      const needsOfficial =
        existing.status !== "approved" || !existing.body.includes("[[") || !parseStoredMetadata(existing.metadata).bronnen;
      if (needsOfficial) {
        await dbRun(
          `UPDATE articles SET title = ?, category = ?, dienst = ?, summary = ?, body = ?, metadata = ?, status = 'approved', updated_at = datetime('now') WHERE id = ?`,
          [
            article.title,
            article.category,
            article.dienst,
            article.summary,
            article.body,
            metadataToJson(article.metadata),
            existing.id,
          ],
        );
      }
      continue;
    }
    const created = await dbRun(
      `INSERT INTO articles (slug, title, category, dienst, summary, body, metadata, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'approved')`,
      [
        article.slug,
        article.title,
        article.category,
        article.dienst,
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
    await dbRun("UPDATE articles SET active_revision_id = ?, updated_at = datetime('now') WHERE id = ?", [
      revision.lastID,
      created.lastID,
    ]);
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
      dienst TEXT NOT NULL DEFAULT '',
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

  await migrateArticles();
  await exec("CREATE INDEX IF NOT EXISTS idx_articles_dienst ON articles(dienst)");
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
