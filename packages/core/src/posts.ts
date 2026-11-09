import { getCollection, type CollectionEntry } from 'astro:content';
import { DEFAULT_LOCALE, slugify, type Locale } from './i18n';
import type { PostType } from './schema';

export type Section = 'posts' | 'notes' | 'links';

export interface Post {
  /** Slug shared by every translation of the post. */
  slug: string;
  /** Locale of the page this post is shown on. */
  locale: Locale;
  /** Locale the shown text is actually in (differs when falling back). */
  contentLocale: Locale;
  /** True when the requested locale has no translation and the default-locale text is shown. */
  fallback: boolean;
  /** Locales this post exists in. */
  available: Locale[];
  section: Section;
  entry: CollectionEntry<'posts'>;
  data: CollectionEntry<'posts'>['data'];
  minutes: number;
}

export function sectionOf(type: PostType): Section {
  return type === 'note' ? 'notes' : type === 'link' ? 'links' : 'posts';
}

/** About 220 words a minute; Vietnamese counts each syllable as a word, which matches reading speed well enough. */
export function readingMinutes(body: string | undefined): number {
  if (!body) return 1;
  const text = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#>*_`\[\]()!-]/g, ' ');
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

function splitId(id: string): { locale: Locale; slug: string } {
  const [locale, ...rest] = id.split('/');
  return { locale: locale as Locale, slug: rest.join('/') };
}

const showDrafts = !import.meta.env.PROD;

async function loadEntries() {
  return getCollection('posts', (entry) => showDrafts || !entry.data.draft);
}

/** Every post for a locale, newest first. Missing translations fall back to the default locale. */
export async function getPosts(locale: Locale): Promise<Post[]> {
  const entries = await loadEntries();
  const bySlug = new Map<string, Partial<Record<Locale, CollectionEntry<'posts'>>>>();
  for (const entry of entries) {
    const { locale: l, slug } = splitId(entry.id);
    const slot = bySlug.get(slug) ?? {};
    slot[l] = entry;
    bySlug.set(slug, slot);
  }
  const posts: Post[] = [];
  for (const [slug, slot] of bySlug) {
    const own = slot[locale];
    const entry = own ?? slot[DEFAULT_LOCALE];
    if (!entry) continue;
    posts.push({
      slug,
      locale,
      contentLocale: own ? locale : DEFAULT_LOCALE,
      fallback: !own,
      available: Object.keys(slot) as Locale[],
      section: sectionOf(entry.data.type),
      entry,
      data: entry.data,
      minutes: readingMinutes(entry.body),
    });
  }
  return posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export async function getPostsBySection(locale: Locale, section: Section): Promise<Post[]> {
  return (await getPosts(locale)).filter((post) => post.section === section);
}

export interface SeriesInfo {
  id: string;
  title: string;
  description: string;
  parts: Post[];
  latest: Date;
}

export async function getSeriesList(locale: Locale): Promise<SeriesInfo[]> {
  const [metas, posts] = await Promise.all([getCollection('series'), getPosts(locale)]);
  return metas
    .map((meta) => {
      const text = meta.data[locale] ?? meta.data.vi;
      const parts = posts
        .filter((post) => post.data.series?.id === meta.id)
        .sort((a, b) => (a.data.series?.part ?? 0) - (b.data.series?.part ?? 0));
      const latest = parts.reduce((max, p) => (p.data.date > max ? p.data.date : max), new Date(0));
      return { id: meta.id, title: text.title, description: text.description, parts, latest };
    })
    .filter((series) => series.parts.length > 0)
    .sort((a, b) => b.latest.getTime() - a.latest.getTime());
}

export async function getSeriesFor(post: Post): Promise<SeriesInfo | undefined> {
  if (!post.data.series) return undefined;
  return (await getSeriesList(post.locale)).find((s) => s.id === post.data.series?.id);
}

export interface TagInfo {
  name: string;
  slug: string;
  count: number;
}

export function tagsOf(posts: Post[]): TagInfo[] {
  const map = new Map<string, TagInfo>();
  for (const post of posts) {
    for (const name of post.data.tags) {
      const slug = slugify(name);
      const info = map.get(slug) ?? { name, slug, count: 0 };
      info.count += 1;
      map.set(slug, info);
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** Previous (older) and next (newer) post in the same section. */
export function neighbours(posts: Post[], post: Post): { prev?: Post; next?: Post } {
  const list = posts.filter((p) => p.section === post.section);
  const index = list.findIndex((p) => p.slug === post.slug);
  return { prev: list[index + 1], next: index > 0 ? list[index - 1] : undefined };
}

/** Group posts by calendar month, for timeline-style indexes. */
export function byMonth(posts: Post[]): { key: string; date: Date; posts: Post[] }[] {
  const groups = new Map<string, { key: string; date: Date; posts: Post[] }>();
  for (const post of posts) {
    const d = post.data.date;
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    const group = groups.get(key) ?? {
      key,
      date: new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)),
      posts: [],
    };
    group.posts.push(post);
    groups.set(key, group);
  }
  return [...groups.values()];
}

export async function getPage(locale: Locale, slug: string) {
  const pages = await getCollection('pages');
  return pages.find((p) => p.id === `${locale}/${slug}`) ?? pages.find((p) => p.id === `${DEFAULT_LOCALE}/${slug}`);
}
