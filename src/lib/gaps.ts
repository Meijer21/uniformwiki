import { slugify } from "./slug.js";
import { KOLOMMEN } from "./taxonomy.js";
import { parseWikiLinks } from "./links.js";
import type { ArticleRow } from "../types.js";

export interface Gap {
  title: string;
  summary: string;
  kolom: string;
  slug: string;
  reason: "thema" | "wikilink";
}

export function articleMatchesTheme(
  article: ArticleRow,
  theme: { slug: string; title: string },
): boolean {
  if (article.slug === theme.slug || slugify(article.title) === theme.slug) {
    return true;
  }
  const title = article.title.toLowerCase();
  const themeTitle = theme.title.toLowerCase();
  if (title === themeTitle || title.includes(themeTitle) || themeTitle.includes(title)) {
    return true;
  }
  const summary = article.summary.toLowerCase();
  return summary.includes(themeTitle);
}

function covered(themeTitle: string, themeSlug: string, articles: ArticleRow[]): boolean {
  return articles.some((article) => articleMatchesTheme(article, { title: themeTitle, slug: themeSlug }));
}

export function findGaps(articles: ArticleRow[], kolomLabel?: string): Gap[] {
  const gaps: Gap[] = [];
  const seen = new Set<string>();
  const kolommen = kolomLabel
    ? KOLOMMEN.filter((kolom) => kolom.label.toLowerCase() === kolomLabel.toLowerCase() || kolom.id === kolomLabel)
    : KOLOMMEN;

  for (const kolom of kolommen) {
    for (const theme of kolom.themes) {
      if (covered(theme.title, theme.slug, articles)) {
        continue;
      }
      const key = `thema:${theme.slug}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      gaps.push({
        title: theme.title,
        summary: theme.summary,
        kolom: kolom.label,
        slug: theme.slug,
        reason: "thema",
      });
    }
  }

  for (const article of articles) {
    const articleKolom = article.dienst?.split(",")[0]?.trim() || "";
    for (const link of parseWikiLinks(article.body)) {
      const slug = slugify(link.target);
      const exists = articles.some(
        (row) => row.slug === slug || row.title.toLowerCase() === link.target.trim().toLowerCase(),
      );
      if (exists) {
        continue;
      }
      const key = `wiki:${slug}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      gaps.push({
        title: link.target.trim(),
        summary: `Iemand verwees hiernaar vanuit “${article.title}”, maar het artikel bestaat nog niet.`,
        kolom: articleKolom || "Overig",
        slug,
        reason: "wikilink",
      });
    }
  }

  return gaps;
}
