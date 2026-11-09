import { z } from 'astro/zod';

/** Sveltia writes empty strings for blank optional fields; treat them as missing. */
const blankToUndefined = (value: unknown) => (value === '' || value === null ? undefined : value);
const optionalString = z.preprocess(blankToUndefined, z.string().optional());
const optionalUrl = z.preprocess(blankToUndefined, z.string().url().optional());

export const POST_TYPES = ['article', 'note', 'link'] as const;
export type PostType = (typeof POST_TYPES)[number];

export const postSchema = z.object({
  title: z.string(),
  description: z.string().default(''),
  date: z.coerce.date(),
  updated: z.preprocess(blankToUndefined, z.coerce.date().optional()),
  type: z.enum(POST_TYPES).default('article'),
  /** Series membership: the series id (a file in content/series) and this post's part number. */
  series: z.preprocess(
    (value) => (value && typeof value === 'object' && (value as { id?: unknown }).id ? value : undefined),
    z.object({ id: z.string(), part: z.coerce.number().int().positive() }).optional(),
  ),
  tags: z.array(z.string()).default([]),
  /** Target URL for link posts. */
  link: optionalUrl,
  cover: optionalString,
  coverAlt: optionalString,
  draft: z.boolean().default(false),
  comments: z.boolean().default(true),
  /** Set on a translation that was machine-drafted and not reviewed yet. */
  aiDraft: z.boolean().default(false),
});

const seriesLocale = z.object({ title: z.string(), description: z.string().default('') });

/** One file per series; locale keys at the top level (Sveltia single_file i18n structure). */
export const seriesSchema = z.object({
  vi: seriesLocale,
  en: seriesLocale.optional(),
});

export const pageSchema = z.object({
  title: z.string(),
  description: z.string().default(''),
});

export type PostData = z.infer<typeof postSchema>;
export type SeriesData = z.infer<typeof seriesSchema>;
