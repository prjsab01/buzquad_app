import en from '../locales/en.json';

type DeepValue<T> = T extends string ? T : T extends Record<string, unknown> ? { [K in keyof T]: DeepValue<T[K]> }[keyof T] : never;
type Locale = typeof en;

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return path;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' ? current : path;
}

const locales: Record<string, Record<string, unknown>> = { en: en as unknown as Record<string, unknown> };
let currentLocale = 'en';

export function setLocale(locale: string) {
  if (locales[locale]) currentLocale = locale;
}

/** Translate a dot-notation key, e.g. t('feed.post') → 'Post' */
export function t(key: string, vars?: Record<string, string>): string {
  let str = getNestedValue(locales[currentLocale] ?? locales.en, key);
  if (vars) {
    Object.entries(vars).forEach(([k, v]) => { str = str.replace(`{{${k}}}`, v); });
  }
  return str;
}

/** React hook version — returns t() bound to current locale */
export function useTranslation() {
  return { t };
}

export type { Locale };
