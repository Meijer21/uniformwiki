/** Versie in de bestandsnaam. Bunny negeert querystrings op CSS. */
export const ASSET_VERSION = "20260915g";

export const CSS_FILE = `/assets/wiki-${ASSET_VERSION}.css`;
export const CONTRIBUTE_JS_FILE = `/assets/contribute-${ASSET_VERSION}.js`;
export const GRAPH_JS_FILE = `/assets/graph-${ASSET_VERSION}.js`;

const SCRIPT_FILES: Record<string, string> = {
  "/assets/contribute.js": CONTRIBUTE_JS_FILE,
  "/assets/graph.js": GRAPH_JS_FILE,
};

export function scriptUrl(path: string): string {
  return SCRIPT_FILES[path] ?? path;
}

export function assetUrl(path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (clean.includes(ASSET_VERSION)) {
    return clean;
  }
  return `${clean}?v=${ASSET_VERSION}`;
}
