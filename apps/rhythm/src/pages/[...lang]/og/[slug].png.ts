import { t, type Locale } from '@blog/core/i18n';
import { renderOg } from '@blog/core/og';
import type { Post } from '@blog/core/posts';
import { ogPaths } from '@blog/core/routes';
import { SITE } from '@blog/core/site';
import type { APIContext } from 'astro';

export const getStaticPaths = () => ogPaths();

// Rhythm palette: white paper, near-black ink, one electric blue.
const COLORS = { bg: '#FFFFFF', ink: '#0E1116', muted: '#5A616B', accent: '#3B3BE8' };

export async function GET(context: APIContext) {
  const { locale, post } = context.props as { locale: Locale; post: Post };
  const png = await renderOg({
    title: post.data.title,
    kicker: t(locale, `type.${post.data.type}`),
    site: `${SITE.origin.replace('https://', '')}`,
    colors: COLORS,
  });
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
}
