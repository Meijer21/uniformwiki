import type { ArticleRow } from "../types.js";
import { slugify } from "./slug.js";
import {
  articleDiensten,
  articleTags,
  buildLinkResolver,
  parseWikiLinks,
  publicArticleTags,
  uniqueLabels,
} from "./links.js";

export type GraphNodeType = "article" | "tag" | "dienst" | "category";
export type GraphEdgeType = "wikilink" | "mention" | "tag" | "dienst" | "category";

export interface GraphNode {
  id: string;
  type: GraphNodeType;
  label: string;
  href: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: GraphEdgeType;
}

export interface GraphPayload {
  nodes: GraphNode[];
  edges: GraphEdge[];
  focus?: string;
}

export interface RelatedArticle {
  id: number;
  slug: string;
  title: string;
  summary: string;
  reasons: string[];
  score: number;
}

export interface ArticleNeighborhood {
  tags: string[];
  diensten: string[];
  outgoing: Array<{ slug: string; title: string }>;
  backlinks: Array<{ slug: string; title: string }>;
  missing: string[];
  related: RelatedArticle[];
}

const WEIGHT: Record<GraphEdgeType, number> = {
  wikilink: 5,
  mention: 3,
  tag: 2,
  dienst: 2,
  category: 1,
};

function nodeId(type: GraphNodeType, value: string): string {
  return `${type}:${slugify(value)}`;
}

function addNode(map: Map<string, GraphNode>, node: GraphNode): void {
  if (!map.has(node.id)) {
    map.set(node.id, node);
  }
}

function addEdge(list: GraphEdge[], seen: Set<string>, edge: GraphEdge): void {
  const key = `${edge.type}|${edge.source}|${edge.target}`;
  const reverse = `${edge.type}|${edge.target}|${edge.source}`;
  if (seen.has(key) || seen.has(reverse)) {
    return;
  }
  seen.add(key);
  list.push(edge);
}

function mentionHits(source: ArticleRow, others: ArticleRow[]): ArticleRow[] {
  const text = `${source.body}\n${source.summary}`.toLowerCase();
  const hits: ArticleRow[] = [];
  for (const other of others) {
    if (other.id === source.id) {
      continue;
    }
    const title = other.title.trim();
    if (title.length < 6) {
      continue;
    }
    if (text.includes(title.toLowerCase())) {
      hits.push(other);
    }
  }
  return hits;
}

export function buildGraph(articles: ArticleRow[]): GraphPayload {
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const seen = new Set<string>();
  const resolve = buildLinkResolver(articles);
  const byId = new Map(articles.map((article) => [article.id, article]));

  for (const article of articles) {
    const articleNode = nodeId("article", article.slug);
    addNode(nodes, {
      id: articleNode,
      type: "article",
      label: article.title,
      href: `/wiki/${encodeURIComponent(article.slug)}`,
    });

    const category = article.category.trim();
    if (category) {
      const catId = nodeId("category", category);
      addNode(nodes, {
        id: catId,
        type: "category",
        label: category,
        href: `/?q=${encodeURIComponent(category)}`,
      });
      addEdge(edges, seen, { source: articleNode, target: catId, type: "category" });
    }

    for (const tag of uniqueLabels(publicArticleTags(article))) {
      const tagId = nodeId("tag", tag);
      addNode(nodes, {
        id: tagId,
        type: "tag",
        label: tag,
        href: `/tag/${encodeURIComponent(slugify(tag))}`,
      });
      addEdge(edges, seen, { source: articleNode, target: tagId, type: "tag" });
    }

    for (const dienst of articleDiensten(article)) {
      const dienstId = nodeId("dienst", dienst);
      addNode(nodes, {
        id: dienstId,
        type: "dienst",
        label: dienst,
        href: `/dienst/${encodeURIComponent(slugify(dienst))}`,
      });
      addEdge(edges, seen, { source: articleNode, target: dienstId, type: "dienst" });
    }

    for (const link of parseWikiLinks(article.body)) {
      const resolved = resolve(link.target);
      if (!resolved || resolved.slug === article.slug) {
        continue;
      }
      addEdge(edges, seen, {
        source: articleNode,
        target: nodeId("article", resolved.slug),
        type: "wikilink",
      });
    }

    for (const other of mentionHits(article, articles)) {
      addEdge(edges, seen, {
        source: articleNode,
        target: nodeId("article", other.slug),
        type: "mention",
      });
    }
  }

  void byId;
  const ids = new Set([...nodes.keys()]);
  return { nodes: [...nodes.values()], edges: edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target)) };
}

export function focusGraph(graph: GraphPayload, slug: string): GraphPayload {
  const focusId = nodeId("article", slug);
  const keep = new Set<string>([focusId]);
  for (const edge of graph.edges) {
    if (edge.source === focusId) {
      keep.add(edge.target);
    }
    if (edge.target === focusId) {
      keep.add(edge.source);
    }
  }
  return {
    nodes: graph.nodes.filter((node) => keep.has(node.id)),
    edges: graph.edges.filter((edge) => keep.has(edge.source) && keep.has(edge.target)),
    focus: slug,
  };
}

export function neighborhood(article: ArticleRow, articles: ArticleRow[]): ArticleNeighborhood {
  const resolve = buildLinkResolver(articles);
  const tags = uniqueLabels(publicArticleTags(article));
  const diensten = articleDiensten(article);
  const outgoing: Array<{ slug: string; title: string }> = [];
  const missing: string[] = [];
  const seenOut = new Set<string>();

  for (const link of parseWikiLinks(article.body)) {
    const resolved = resolve(link.target);
    if (!resolved) {
      missing.push(link.target);
      continue;
    }
    if (resolved.slug === article.slug || seenOut.has(resolved.slug)) {
      continue;
    }
    seenOut.add(resolved.slug);
    outgoing.push({ slug: resolved.slug, title: resolved.title });
  }

  const backlinks: Array<{ slug: string; title: string }> = [];
  const scores = new Map<number, { article: ArticleRow; reasons: Set<string>; score: number }>();

  const bump = (other: ArticleRow, reason: string, weight: number): void => {
    if (other.id === article.id) {
      return;
    }
    const row = scores.get(other.id) ?? { article: other, reasons: new Set<string>(), score: 0 };
    row.score += weight;
    row.reasons.add(reason);
    scores.set(other.id, row);
  };

  for (const other of articles) {
    if (other.id === article.id) {
      continue;
    }
    for (const link of parseWikiLinks(other.body)) {
      const resolved = resolve(link.target);
      if (resolved?.slug === article.slug) {
        backlinks.push({ slug: other.slug, title: other.title });
        bump(other, "Terugverwijzing", WEIGHT.wikilink);
      }
    }
    for (const out of outgoing) {
      if (out.slug === other.slug) {
        bump(other, "Wikilink", WEIGHT.wikilink);
      }
    }
    const sharedTags = uniqueLabels(publicArticleTags(other)).filter((tag) =>
      tags.some((mine) => mine.toLowerCase() === tag.toLowerCase()),
    );
    if (sharedTags.length) {
      bump(other, `Tag: ${sharedTags[0]}`, WEIGHT.tag * sharedTags.length);
    }
    const sharedDienst = articleDiensten(other).filter((dienst) =>
      diensten.some((mine) => mine.toLowerCase() === dienst.toLowerCase()),
    );
    if (sharedDienst.length) {
      bump(other, `Dienst: ${sharedDienst[0]}`, WEIGHT.dienst);
    }
    if (other.category && other.category.toLowerCase() === article.category.toLowerCase()) {
      bump(other, `Categorie: ${article.category}`, WEIGHT.category);
    }
    if (mentionHits(article, [other]).length || mentionHits(other, [article]).length) {
      bump(other, "Genoemd bij naam", WEIGHT.mention);
    }
  }

  const related = [...scores.values()]
    .sort((a, b) => b.score - a.score || a.article.title.localeCompare(b.article.title, "nl"))
    .slice(0, 8)
    .map((row) => ({
      id: row.article.id,
      slug: row.article.slug,
      title: row.article.title,
      summary: row.article.summary,
      reasons: [...row.reasons],
      score: row.score,
    }));

  return { tags, diensten, outgoing, backlinks, missing, related };
}

export function filterArticles(
  articles: ArticleRow[],
  options: { tag?: string; dienst?: string; category?: string; query?: string },
): ArticleRow[] {
  const tag = options.tag?.trim().toLowerCase();
  const dienst = options.dienst?.trim().toLowerCase();
  const category = options.category?.trim().toLowerCase();
  const query = options.query?.trim().toLowerCase();
  return articles.filter((article) => {
    if (category && article.category.toLowerCase() !== category) {
      return false;
    }
    if (tag) {
      const tags = uniqueLabels(articleTags(article)).map((item) => slugify(item));
      if (!tags.includes(slugify(tag)) && !tags.includes(tag.replace(/\s+/g, "-"))) {
        const labels = uniqueLabels(articleTags(article)).map((item) => item.toLowerCase());
        if (!labels.includes(tag)) {
          return false;
        }
      }
    }
    if (dienst) {
      const list = articleDiensten(article).map((item) => slugify(item));
      const labels = articleDiensten(article).map((item) => item.toLowerCase());
      if (!list.includes(slugify(dienst)) && !labels.includes(dienst)) {
        return false;
      }
    }
    if (query) {
      const hay = `${article.title} ${article.summary} ${article.body} ${article.category} ${article.dienst}`.toLowerCase();
      if (!hay.includes(query)) {
        return false;
      }
    }
    return true;
  });
}

export function collectTaxonomy(articles: ArticleRow[]): {
  tags: Array<{ label: string; slug: string; count: number }>;
  diensten: Array<{ label: string; slug: string; count: number }>;
} {
  const tags = new Map<string, { label: string; count: number }>();
  const diensten = new Map<string, { label: string; count: number }>();
  for (const article of articles) {
    for (const tag of uniqueLabels(articleTags(article))) {
      const key = slugify(tag);
      const row = tags.get(key) ?? { label: tag, count: 0 };
      row.count += 1;
      tags.set(key, row);
    }
    for (const dienst of articleDiensten(article)) {
      const key = slugify(dienst);
      const row = diensten.get(key) ?? { label: dienst, count: 0 };
      row.count += 1;
      diensten.set(key, row);
    }
  }
  const sortCount = (a: { label: string; count: number }, b: { label: string; count: number }) =>
    b.count - a.count || a.label.localeCompare(b.label, "nl");
  return {
    tags: [...tags.entries()]
      .map(([slug, row]) => ({ slug, ...row }))
      .sort(sortCount),
    diensten: [...diensten.entries()]
      .map(([slug, row]) => ({ slug, ...row }))
      .sort(sortCount),
  };
}
