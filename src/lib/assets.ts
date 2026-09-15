/** Bump bij elke CSS/JS-wijziging, anders blijft Bunny/browser de oude file geven. */
export const ASSET_VERSION = "20260915e";

export function assetUrl(path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${clean}?v=${ASSET_VERSION}`;
}
