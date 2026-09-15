export type ArticleStatus = "pending" | "approved" | "rejected" | "archived";
export type RevisionStatus = "pending" | "approved" | "rejected";
export type ApiKeyTier = "public_read" | "mcp" | "admin";
export type ApiKeyStatus = "active" | "suspended" | "revoked";

export interface ArticleRow {
  id: number;
  slug: string;
  title: string;
  category: string;
  dienst: string;
  summary: string;
  body: string;
  metadata: string;
  status: ArticleStatus;
  active_revision_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface RevisionRow {
  id: number;
  article_id: number;
  title: string;
  summary: string;
  body: string;
  metadata: string;
  category: string;
  contributor_name: string;
  contributor_note: string;
  status: RevisionStatus;
  created_at: string;
}

export interface ApiKeyRow {
  id: number;
  key: string;
  key_prefix: string;
  label: string;
  tier: ApiKeyTier;
  status: ApiKeyStatus;
  expires_at: string | null;
  customer_email: string | null;
  fluentcart_customer_id: string | null;
  fluentcart_order_id: string | null;
  fluentcart_subscription_id: string | null;
  created_at: string;
  last_used_at: string | null;
}

export interface CategoryCount {
  category: string;
  count: number;
}

export interface ArticleMetadata {
  bronnen?: string;
  licentie?: string;
  trefwoorden?: string;
  tags?: string;
  dienst?: string;
  diensten?: string;
  ai?: string;
  [key: string]: string | undefined;
}

export interface WikiWriteInput {
  title: string;
  category: string;
  summary: string;
  body: string;
  slug?: string;
  articleId?: number;
  contributorName?: string;
  contributorNote?: string;
  dienst?: string;
  tags?: string;
  bronnen?: string;
  aiOrigin?: string;
}

declare module "fastify" {
  interface FastifyRequest {
    apiKey?: ApiKeyRow;
    rawBody?: string;
  }
}
