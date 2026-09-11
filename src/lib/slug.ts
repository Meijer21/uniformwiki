export function slugify(value: string): string {
  const ascii = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return ascii || "artikel";
}

export async function uniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>,
): Promise<string> {
  const root = slugify(base);
  if (!(await exists(root))) {
    return root;
  }
  for (let i = 2; i < 500; i += 1) {
    const candidate = `${root}-${i}`;
    if (!(await exists(candidate))) {
      return candidate;
    }
  }
  return `${root}-${Date.now()}`;
}
