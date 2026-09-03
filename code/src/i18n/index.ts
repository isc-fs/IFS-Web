import es from './es.json';
import en from './en.json';

export const languages = { es: 'Español', en: 'English' } as const;
export const defaultLang = 'es';

export type Lang = keyof typeof languages;

const dictionaries = { es, en };

export type Dictionary = typeof es;

export function isLang(value: string | undefined): value is Lang {
  return value === 'es' || value === 'en';
}

/** Copy for a language. Falls back to Spanish, the default. */
export function useTranslations(lang: string | undefined): Dictionary {
  return (isLang(lang) ? dictionaries[lang] : dictionaries[defaultLang]) as Dictionary;
}

/** Prefixed path helper: path('en', '/team') -> '/en/team' */
export function path(lang: Lang, to = '/'): string {
  const clean = to === '/' ? '' : to.replace(/^\/+/, '/');
  return `/${lang}${clean}`;
}

/** The same page in the other language. */
export function otherLang(lang: Lang): Lang {
  return lang === 'es' ? 'en' : 'es';
}

/** Route slugs are identical in both languages; only labels are translated. */
export const routes = ['', 'team', 'competition', 'sponsors', 'news'] as const;

export function navItems(lang: Lang, current: string) {
  const t = useTranslations(lang);
  return [
    { label: t.nav.home, href: path(lang), key: '' },
    { label: t.nav.team, href: path(lang, '/team'), key: 'team' },
    { label: t.nav.competition, href: path(lang, '/competition'), key: 'competition' },
    { label: t.nav.sponsors, href: path(lang, '/sponsors'), key: 'sponsors' },
    { label: t.nav.news, href: path(lang, '/news'), key: 'news' }
  ].map((item) => ({ ...item, current: item.key === current }));
}

/** Days remaining until an ISO date, floored at zero. */
export function daysUntil(iso: string): number {
  const target = new Date(`${iso}T09:00:00`).getTime();
  return Math.max(0, Math.ceil((target - Date.now()) / 86400000));
}
