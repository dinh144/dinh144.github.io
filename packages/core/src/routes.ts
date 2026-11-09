import { DEFAULT_LOCALE, LOCALES, langParam, slugify, type Locale } from './i18n';
import { getPosts, getSeriesList, tagsOf, type Post, type Section } from './posts';

/** The app's base path without a trailing slash ('' at the domain root, '/lab/ink' in the lab). */
export const BASE = (import.meta.env.BASE_URL ?? '/').replace(/\/+$/, '');

function prefix(locale: Locale): string {
  return locale === DEFAULT_LOCALE ? '' : `/${locale}`;
}

/** Join base + locale prefix + path, always ending directory paths with a slash. */
export function href(locale: Locale, path = '/'): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  const full = `${BASE}${prefix(locale)}${clean}`;
  return /\.[a-z0-9]+$/i.test(full) || full.endsWith('/') ? full : `${full}/`;
}

export const paths = {
  home: (locale: Locale) => href(locale, '/'),
  section: (locale: Locale, section: Section) => href(locale, `/${section}/`),
  post: (post: Pick<Post, 'locale' | 'section' | 'slug'>) => href(post.locale, `/${post.section}/${post.slug}/`),
  seriesList: (locale: Locale) => href(locale, '/series/'),
  series: (locale: Locale, id: string) => href(locale, `/series/${id}/`),
  tags: (locale: Locale) => href(locale, '/tags/'),
  tag: (locale: Locale, tag: string) => href(locale, `/tags/${slugify(tag)}/`),
  about: (locale: Locale) => href(locale, '/about/'),
  search: (locale: Locale) => href(locale, '/search/'),
  rss: (locale: Locale) => href(locale, '/rss.xml'),
  og: (locale: Locale, slug: string) => href(locale, `/og/${slug}.png`),
  /** Root-level media uploaded through the CMS (served by the hub at /media). */
  media: (file: string) => (file.startsWith('http') ? file : `/media/${file.replace(/^\/?media\//, '')}`),
};

/** Strip base + locale prefix from a pathname, so the same page can be linked in the other locale. */
export function unlocalize(pathname: string): string {
  let rest = pathname.startsWith(BASE) ? pathname.slice(BASE.length) : pathname;
  for (const locale of LOCALES) {
    if (locale === DEFAULT_LOCALE) continue;
    if (rest === `/${locale}` || rest.startsWith(`/${locale}/`)) rest = rest.slice(locale.length + 1);
  }
  return rest || '/';
}

export function switchLocale(pathname: string, to: Locale): string {
  return href(to, unlocalize(pathname));
}

/* ---------- getStaticPaths helpers (keep theme pages thin) ---------- */

export function localePaths() {
  return LOCALES.map((locale) => ({ params: { lang: langParam(locale) }, props: { locale } }));
}

export function sectionPaths() {
  const sections: Section[] = ['posts', 'notes', 'links'];
  return LOCALES.flatMap((locale) =>
    sections.map((section) => ({ params: { lang: langParam(locale), section }, props: { locale, section } })),
  );
}

export async function postPaths() {
  const out = [];
  for (const locale of LOCALES) {
    for (const post of await getPosts(locale)) {
      out.push({
        params: { lang: langParam(locale), section: post.section, slug: post.slug },
        props: { locale, post },
      });
    }
  }
  return out;
}

export async function seriesPaths() {
  const out = [];
  for (const locale of LOCALES) {
    for (const series of await getSeriesList(locale)) {
      out.push({ params: { lang: langParam(locale), id: series.id }, props: { locale, series } });
    }
  }
  return out;
}

export async function tagPaths() {
  const out = [];
  for (const locale of LOCALES) {
    const posts = await getPosts(locale);
    for (const tag of tagsOf(posts)) {
      out.push({
        params: { lang: langParam(locale), tag: tag.slug },
        props: { locale, tag, posts: posts.filter((p) => p.data.tags.some((t) => slugify(t) === tag.slug)) },
      });
    }
  }
  return out;
}

export async function ogPaths() {
  const out = [];
  for (const locale of LOCALES) {
    for (const post of await getPosts(locale)) {
      out.push({ params: { lang: langParam(locale), slug: post.slug }, props: { locale, post } });
    }
  }
  return out;
}
