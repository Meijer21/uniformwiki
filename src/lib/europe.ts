/** ISO-landen die we als Europa behandelen (EU, EEA, VK, CH, Balkan, microstaten). */
export const EUROPE_COUNTRY_CODES = [
  "AD", "AL", "AT", "AX", "BA", "BE", "BG", "CH", "CY", "CZ",
  "DE", "DK", "EE", "ES", "FI", "FO", "FR", "GB", "GG", "GI",
  "GR", "HR", "HU", "IE", "IM", "IS", "IT", "JE", "LI", "LT",
  "LU", "LV", "MC", "MD", "ME", "MK", "MT", "NL", "NO", "PL",
  "PT", "RO", "RS", "SE", "SI", "SJ", "SK", "SM", "UA", "VA",
  "XK",
] as const;

const EUROPE = new Set<string>(EUROPE_COUNTRY_CODES);

export function isEuropeanCountry(code: string | undefined): boolean {
  if (!code) {
    return true;
  }
  return EUROPE.has(code.trim().toUpperCase());
}

export function requestCountryCode(headers: Record<string, unknown>): string | undefined {
  const raw =
    headers["cdn-requestcountrycode"] ??
    headers["CDN-RequestCountryCode"] ??
    headers["cf-ipcountry"] ??
    headers["x-country-code"];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }
  return value.trim().toUpperCase();
}
