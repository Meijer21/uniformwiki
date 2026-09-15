import { slugify } from "./slug.js";
import { KOLOMMEN, type Kolom, type Thema, kolomById } from "./taxonomy.js";
import { listVocab } from "./vocab.js";

export interface PublicColumn {
  id: string;
  label: string;
  summary: string;
  themes: Thema[];
  extra: boolean;
}

function fromKolom(kolom: Kolom): PublicColumn {
  return {
    id: kolom.id,
    label: kolom.label,
    summary: kolom.summary,
    themes: kolom.themes,
    extra: false,
  };
}

export async function listPublicColumns(): Promise<PublicColumn[]> {
  const approved = await listVocab("dienst", "approved");
  const seen = new Set<string>();
  const out: PublicColumn[] = [];

  const remember = (id: string, label: string): boolean => {
    const keys = [slugify(id), slugify(label)];
    if (keys.some((key) => seen.has(key))) {
      return false;
    }
    for (const key of keys) {
      seen.add(key);
    }
    return true;
  };

  for (const kolom of KOLOMMEN) {
    remember(kolom.id, kolom.label);
    out.push(fromKolom(kolom));
  }
  for (const row of approved) {
    const known = kolomById(row.slug) || kolomById(row.label);
    if (known) {
      continue;
    }
    if (!remember(row.slug, row.label)) {
      continue;
    }
    out.push({
      id: row.slug,
      label: row.label,
      summary: "Voorgesteld via de wiki. Nog zonder vaste thema’s.",
      themes: [],
      extra: true,
    });
  }
  return out;
}

export async function resolveColumn(id: string): Promise<PublicColumn | undefined> {
  const known = kolomById(id);
  if (known) {
    return fromKolom(known);
  }
  const columns = await listPublicColumns();
  const key = slugify(id);
  return columns.find((column) => column.id === key || slugify(column.label) === key);
}
