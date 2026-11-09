import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { pageSchema, postSchema, seriesSchema } from './schema';

/**
 * Every app lives at apps/<name>, and Astro runs from that folder,
 * so the shared content folder is two levels up.
 */
const CONTENT = '../../content';

export const collections = {
  /** content/posts/<locale>/<slug>.md -> id "<locale>/<slug>" */
  posts: defineCollection({
    loader: glob({ pattern: '{vi,en}/**/[^_]*.{md,mdx}', base: `${CONTENT}/posts` }),
    schema: postSchema,
  }),
  /** content/series/<id>.yml */
  series: defineCollection({
    loader: glob({ pattern: '*.{yml,yaml}', base: `${CONTENT}/series` }),
    schema: seriesSchema,
  }),
  /** content/pages/<locale>/<slug>.md (about, ...) */
  pages: defineCollection({
    loader: glob({ pattern: '{vi,en}/**/[^_]*.{md,mdx}', base: `${CONTENT}/pages` }),
    schema: pageSchema,
  }),
};
