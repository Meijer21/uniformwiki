import { dbAll, dbGet, dbRun } from "../db.js";
import { sanitizeRecord } from "../middleware/sanitizer.js";
import { sanitizeWikiBody } from "./safe-text.js";
import type {
  ArticleRow,
  ArticleStatus,
  CategoryCount,
  RevisionRow,
  WikiWriteInput,
} from "../types.js";
import { articleDiensten, articleTags, mergeTagLists, splitList } from "./links.js";
import { metadataToJson, parseMetadataBlock, parseStoredMetadata } from "./metadata.js";
import { slugify, uniqueSlug } from "./slug.js";
import { approveTermsFromText, proposeUnknownTerms } from "./vocab.js";

export interface WriteResult {
  article: ArticleRow;
  revision: RevisionRow;
  created: boolean;
}

function sanitizeInput(input: WikiWriteInput): WikiWriteInput {
  return sanitizeRecord(
    {
      ...input,
      title: input.title.trim(),
      category: input.category.trim(),
      summary: input.summary.trim(),
      body: sanitizeWikiBody(input.body),
      slug: input.slug?.trim(),
      dienst: (input.dienst ?? "").trim(),
      tags: (input.tags ?? "").trim(),
      bronnen: (input.bronnen ?? "").trim(),
      aiOrigin: (input.aiOrigin ?? "").trim(),
      contributorName: (input.contributorName ?? "anoniem").trim() || "anoniem",
      contributorNote: (input.contributorNote ?? "").trim(),
    },
    [
      "title",
      "category",
      "summary",
      "body",
      "dienst",
      "tags",
      "bronnen",
      "contributorName",
      "contributorNote",
    ],
  );
}

function mergedMetadata(clean: WikiWriteInput, parsed: ReturnType<typeof parseMetadataBlock>) {
  const metadata = { ...parsed.metadata };
  metadata.trefwoorden = mergeTagLists(clean.tags, metadata.trefwoorden, metadata.tags);
  metadata.dienst = mergeTagLists(clean.dienst, metadata.dienst, metadata.diensten);
  metadata.bronnen = clean.bronnen || metadata.bronnen || "";
  if (clean.aiOrigin) {
    metadata.ai = clean.aiOrigin;
  }
  if (!metadata.licentie) {
    metadata.licentie = "CC-BY-SA-4.0";
  }
  return metadata;
}

export async function listCategories(): Promise<CategoryCount[]> {
  return dbAll<CategoryCount>(
    `SELECT category, COUNT(*) AS count
     FROM articles
     WHERE status = 'approved'
     GROUP BY category
     ORDER BY category COLLATE NOCASE ASC`,
  );
}

export async function listApprovedArticles(query?: string, category?: string): Promise<ArticleRow[]> {
  const clauses = ["status = 'approved'"];
  const params: unknown[] = [];
  if (query) {
    clauses.push("(title LIKE ? OR summary LIKE ? OR body LIKE ? OR category LIKE ? OR dienst LIKE ? OR metadata LIKE ?)");
    const like = `%${query}%`;
    params.push(like, like, like, like, like, like);
  }
  if (category) {
    clauses.push("category = ?");
    params.push(category);
  }
  return dbAll<ArticleRow>(
    `SELECT * FROM articles WHERE ${clauses.join(" AND ")} ORDER BY updated_at DESC, title ASC`,
    params,
  );
}

export async function getApprovedArticle(idOrSlug: string): Promise<ArticleRow | undefined> {
  if (/^\d+$/.test(idOrSlug)) {
    return dbGet<ArticleRow>("SELECT * FROM articles WHERE id = ? AND status = 'approved'", [Number(idOrSlug)]);
  }
  return dbGet<ArticleRow>("SELECT * FROM articles WHERE slug = ? AND status = 'approved'", [idOrSlug]);
}

export async function getArticleByAny(idOrSlug: string): Promise<ArticleRow | undefined> {
  if (/^\d+$/.test(idOrSlug)) {
    return dbGet<ArticleRow>("SELECT * FROM articles WHERE id = ?", [Number(idOrSlug)]);
  }
  return dbGet<ArticleRow>("SELECT * FROM articles WHERE slug = ?", [idOrSlug]);
}

export async function listRevisions(articleId: number): Promise<RevisionRow[]> {
  return dbAll<RevisionRow>(
    `SELECT * FROM article_revisions WHERE article_id = ? ORDER BY created_at DESC, id DESC`,
    [articleId],
  );
}

export async function listPendingRevisions(): Promise<Array<RevisionRow & { slug: string }>> {
  return dbAll<RevisionRow & { slug: string }>(
    `SELECT r.*, a.slug AS slug
     FROM article_revisions r
     JOIN articles a ON a.id = r.article_id
     WHERE r.status = 'pending'
     ORDER BY r.created_at ASC`,
  );
}

export async function listAllArticles(): Promise<ArticleRow[]> {
  return dbAll<ArticleRow>("SELECT * FROM articles ORDER BY updated_at DESC");
}

async function slugTaken(slug: string): Promise<boolean> {
  const row = await dbGet<{ id: number }>("SELECT id FROM articles WHERE slug = ?", [slug]);
  return Boolean(row);
}

export async function writeArticle(input: WikiWriteInput, asApproved: boolean): Promise<WriteResult> {
  const clean = sanitizeInput(input);
  if (!clean.title || !clean.category || !clean.body.trim()) {
    throw new Error("Titel, categorie en tekst zijn verplicht.");
  }

  const parsed = parseMetadataBlock(clean.body);
  const metadataObj = mergedMetadata(clean, parsed);
  const metadata = metadataToJson(metadataObj);
  const body = parsed.body;
  const summary = clean.summary || body.slice(0, 180).replace(/\s+/g, " ");
  const dienst = metadataObj.dienst ?? "";
  const status: ArticleStatus = asApproved ? "approved" : "pending";
  const revisionStatus = asApproved ? "approved" : "pending";

  let article: ArticleRow | undefined;
  if (clean.articleId) {
    article = await dbGet<ArticleRow>("SELECT * FROM articles WHERE id = ?", [clean.articleId]);
  }
  if (!article && clean.slug) {
    article = await dbGet<ArticleRow>("SELECT * FROM articles WHERE slug = ?", [slugify(clean.slug)]);
  }
  if (!article) {
    article = await dbGet<ArticleRow>("SELECT * FROM articles WHERE slug = ?", [slugify(clean.title)]);
  }

  const created = !article;
  if (!article) {
    const slug = await uniqueSlug(clean.slug || clean.title, slugTaken);
    const inserted = await dbRun(
      `INSERT INTO articles (slug, title, category, dienst, summary, body, metadata, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [slug, clean.title, clean.category, dienst, summary, body, metadata, status],
    );
    article = await dbGet<ArticleRow>("SELECT * FROM articles WHERE id = ?", [inserted.lastID]);
    if (!article) {
      throw new Error("Artikel kon niet worden aangemaakt.");
    }
  }

  const revisionInsert = await dbRun(
    `INSERT INTO article_revisions (
       article_id, title, summary, body, metadata, category,
       contributor_name, contributor_note, status
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      article.id,
      clean.title,
      summary,
      body,
      metadata,
      clean.category,
      clean.contributorName ?? "anoniem",
      clean.contributorNote ?? "",
      revisionStatus,
    ],
  );

  if (asApproved) {
    await dbRun(
      `UPDATE articles
       SET title = ?, category = ?, dienst = ?, summary = ?, body = ?, metadata = ?,
           status = 'approved', active_revision_id = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [clean.title, clean.category, dienst, summary, body, metadata, revisionInsert.lastID, article.id],
    );
  } else if (created) {
    await dbRun("UPDATE articles SET updated_at = datetime('now') WHERE id = ?", [article.id]);
  }

  const revision = await dbGet<RevisionRow>("SELECT * FROM article_revisions WHERE id = ?", [
    revisionInsert.lastID,
  ]);
  const updated = await dbGet<ArticleRow>("SELECT * FROM articles WHERE id = ?", [article.id]);
  if (!revision || !updated) {
    throw new Error("Revisie kon niet worden opgeslagen.");
  }
  const tags = splitList(metadataObj.trefwoorden);
  if (asApproved) {
    await approveTermsFromText(clean.category, dienst, tags);
  } else {
    await proposeUnknownTerms(clean.category, dienst, tags);
  }
  return { article: updated, revision, created };
}

export async function setRevisionDecision(revisionId: number, decision: "approved" | "rejected"): Promise<void> {
  const revision = await dbGet<RevisionRow>("SELECT * FROM article_revisions WHERE id = ?", [revisionId]);
  if (!revision) {
    throw new Error("Revisie niet gevonden.");
  }
  if (revision.status !== "pending") {
    throw new Error("Deze revisie is al beoordeeld.");
  }

  await dbRun("UPDATE article_revisions SET status = ? WHERE id = ?", [decision, revisionId]);

  if (decision === "approved") {
    const meta = parseStoredMetadata(revision.metadata);
    await dbRun(
      `UPDATE articles
       SET title = ?, category = ?, dienst = ?, summary = ?, body = ?, metadata = ?,
           status = 'approved', active_revision_id = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [
        revision.title,
        revision.category,
        meta.dienst ?? "",
        revision.summary,
        revision.body,
        revision.metadata,
        revision.id,
        revision.article_id,
      ],
    );
    await approveTermsFromText(revision.category, meta.dienst ?? "", splitList(meta.trefwoorden));
    return;
  }

  const article = await dbGet<ArticleRow>("SELECT * FROM articles WHERE id = ?", [revision.article_id]);
  if (article && article.status === "pending" && !article.active_revision_id) {
    await dbRun(
      `UPDATE articles SET status = 'rejected', updated_at = datetime('now') WHERE id = ?`,
      [article.id],
    );
  }
}

export function articlePublicJson(article: ArticleRow, revisions?: RevisionRow[]) {
  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    category: article.category,
    summary: article.summary,
    body: article.body,
    dienst: article.dienst ?? "",
    tags: articleTags(article),
    diensten: articleDiensten(article),
    metadata: parseStoredMetadata(article.metadata),
    status: article.status,
    active_revision_id: article.active_revision_id,
    created_at: article.created_at,
    updated_at: article.updated_at,
    changelog: (revisions ?? []).map((revision) => ({
      id: revision.id,
      status: revision.status,
      title: revision.title,
      contributor_name: revision.contributor_name,
      contributor_note: revision.contributor_note,
      created_at: revision.created_at,
    })),
  };
}
