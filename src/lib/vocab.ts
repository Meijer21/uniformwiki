import { dbAll, dbGet, dbRun } from "../db.js";
import type { ArticleRow, VocabKind, VocabRow, VocabStatus } from "../types.js";
import { articleTags, splitList } from "./links.js";
import { parseStoredMetadata } from "./metadata.js";
import { slugify } from "./slug.js";
import { KOLOMMEN } from "./taxonomy.js";

export async function ensureVocabTable(): Promise<void> {
  await dbRun(`
    CREATE TABLE IF NOT EXISTS vocab (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL CHECK (kind IN ('tag', 'category', 'dienst')),
      label TEXT NOT NULL,
      slug TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (kind, slug)
    )
  `);
  await dbRun("CREATE INDEX IF NOT EXISTS idx_vocab_kind_status ON vocab(kind, status)");
}

export async function listVocab(kind?: VocabKind, status: VocabStatus = "approved"): Promise<VocabRow[]> {
  if (kind) {
    return dbAll<VocabRow>(
      "SELECT * FROM vocab WHERE kind = ? AND status = ? ORDER BY label COLLATE NOCASE ASC",
      [kind, status],
    );
  }
  return dbAll<VocabRow>(
    "SELECT * FROM vocab WHERE status = ? ORDER BY kind ASC, label COLLATE NOCASE ASC",
    [status],
  );
}

export async function listPendingVocab(): Promise<VocabRow[]> {
  return dbAll<VocabRow>("SELECT * FROM vocab WHERE status = 'pending' ORDER BY created_at ASC");
}

export async function findVocab(kind: VocabKind, label: string): Promise<VocabRow | undefined> {
  const slug = slugify(label);
  return dbGet<VocabRow>("SELECT * FROM vocab WHERE kind = ? AND slug = ?", [kind, slug]);
}

export async function proposeVocab(kind: VocabKind, label: string): Promise<VocabRow | undefined> {
  const trimmed = label.trim();
  if (!trimmed) {
    return undefined;
  }
  const slug = slugify(trimmed);
  const existing = await dbGet<VocabRow>("SELECT * FROM vocab WHERE kind = ? AND slug = ?", [kind, slug]);
  if (existing) {
    return existing;
  }
  await dbRun("INSERT INTO vocab (kind, label, slug, status) VALUES (?, ?, ?, 'pending')", [kind, trimmed, slug]);
  return dbGet<VocabRow>("SELECT * FROM vocab WHERE kind = ? AND slug = ?", [kind, slug]);
}

export async function approveVocabLabel(kind: VocabKind, label: string): Promise<void> {
  const trimmed = label.trim();
  if (!trimmed) {
    return;
  }
  const slug = slugify(trimmed);
  const existing = await dbGet<VocabRow>("SELECT * FROM vocab WHERE kind = ? AND slug = ?", [kind, slug]);
  if (existing) {
    if (existing.status !== "approved") {
      await dbRun("UPDATE vocab SET status = 'approved', label = ? WHERE id = ?", [trimmed, existing.id]);
    }
    return;
  }
  await dbRun("INSERT INTO vocab (kind, label, slug, status) VALUES (?, ?, ?, 'approved')", [kind, trimmed, slug]);
}

export async function setVocabDecision(id: number, decision: "approved" | "rejected"): Promise<void> {
  const row = await dbGet<VocabRow>("SELECT * FROM vocab WHERE id = ?", [id]);
  if (!row) {
    throw new Error("Dit voorstel kennen we niet.");
  }
  if (row.status !== "pending") {
    throw new Error("Dit voorstel is al beoordeeld.");
  }
  await dbRun("UPDATE vocab SET status = ? WHERE id = ?", [decision, id]);
}

export async function approveTermsFromText(category: string, dienst: string, tags: string[]): Promise<void> {
  await approveVocabLabel("category", category);
  await approveVocabLabel("dienst", dienst);
  for (const tag of tags) {
    await approveVocabLabel("tag", tag);
  }
}

export async function proposeUnknownTerms(category: string, dienst: string, tags: string[]): Promise<void> {
  const knownCategory = await findVocab("category", category);
  if (!knownCategory || knownCategory.status !== "approved") {
    await proposeVocab("category", category);
  }
  if (dienst.trim()) {
    const knownDienst = await findVocab("dienst", dienst);
    if (!knownDienst || knownDienst.status !== "approved") {
      await proposeVocab("dienst", dienst);
    }
  }
  for (const tag of tags) {
    const known = await findVocab("tag", tag);
    if (!known || known.status !== "approved") {
      await proposeVocab("tag", tag);
    }
  }
}

export async function seedVocab(articles: ArticleRow[]): Promise<void> {
  await ensureVocabTable();
  for (const kolom of KOLOMMEN) {
    await approveVocabLabel("dienst", kolom.label);
  }
  const categories = new Set<string>(["Over", "Begrippen", "Normen", "Uitrusting"]);
  const tags = new Set<string>();
  for (const article of articles) {
    if (article.category) {
      categories.add(article.category);
    }
    for (const tag of articleTags(article)) {
      tags.add(tag);
    }
    for (const tag of splitList(parseStoredMetadata(article.metadata).trefwoorden)) {
      tags.add(tag);
    }
  }
  for (const category of categories) {
    await approveVocabLabel("category", category);
  }
  for (const tag of tags) {
    await approveVocabLabel("tag", tag);
  }
}
