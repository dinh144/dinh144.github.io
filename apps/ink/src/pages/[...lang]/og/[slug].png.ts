import { t, type Locale } from '@blog/core/i18n';
import { renderOg } from '@blog/core/og';
import type { Post } from '@blog/core/posts';
import { ogPaths } from '@blog/core/routes';
import { SITE } from '@blog/core/site';
import type { APIContext } from 'astro';

export const getStaticPaths = () => ogPaths();

// Ink & paper palette: warm paper, soft sumi ink, cinnabar seal.
const COLORS = { bg: '#F4F1EA', ink: '#2A2523', muted: '#6A625C', accent: '#A50E1A' };

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
