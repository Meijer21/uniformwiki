function isValidBsn(digits: string): boolean {
  if (!/^\d{9}$/.test(digits)) {
    return false;
  }
  if (digits === "000000000") {
    return false;
  }
  let sum = 0;
  for (let i = 0; i < 8; i += 1) {
    sum += Number(digits[i]) * (9 - i);
  }
  sum -= Number(digits[8]);
  return sum % 11 === 0;
}

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_RE =
  /(?:\+|00)31[\s.-]*(?:\(0\)[\s.-]*)?\d(?:[\s.-]*\d){8}\b|\b0[1-9](?:[\s.-]*\d){8}\b/g;
const BSN_DOTTED_RE = /\b\d{4}\.\d{2}\.\d{3}\b/g;
const BSN_PLAIN_RE = /(?<!\d)\d{9}(?!\d)/g;

export function sanitizeText(input: string): string {
  let text = input;

  text = text.replace(EMAIL_RE, "[E-MAIL VERWIJDERD]");
  text = text.replace(PHONE_RE, "[TELEFOON VERWIJDERD]");

  text = text.replace(BSN_DOTTED_RE, (match) => {
    const digits = match.replace(/\./g, "");
    return isValidBsn(digits) ? "[BSN VERWIJDERD]" : match;
  });

  text = text.replace(BSN_PLAIN_RE, (match) => {
    return isValidBsn(match) ? "[BSN VERWIJDERD]" : match;
  });

  return text;
}

export function sanitizeRecord<T extends Record<string, unknown>>(record: T, keys: (keyof T)[]): T {
  const next = { ...record };
  for (const key of keys) {
    const value = next[key];
    if (typeof value === "string") {
      next[key] = sanitizeText(value) as T[keyof T];
    }
  }
  return next;
}
