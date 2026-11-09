import type { Post } from '@blog/core/posts';

/**
 * "№" chapter numbers: every post gets its place in the whole archive, oldest = 1.
 * Presentation only; computed from the list core already returns (newest first).
 */
export function chapterNumbers(all: Post[]): Map<string, number> {
  const map = new Map<string, number>();
  all.forEach((post, i) => map.set(post.slug, all.length - i));
  return map;
}

export const pad2 = (n: number | undefined) => (n === undefined ? '' : String(n).padStart(2, '0'));
