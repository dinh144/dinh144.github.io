import { t, type Locale } from '@blog/core/i18n';
import { renderOg } from '@blog/core/og';
import type { Post } from '@blog/core/posts';
import { ogPaths } from '@blog/core/routes';
import { SITE } from '@blog/core/site';
import type { APIContext } from 'astro';

export const getStaticPaths = () => ogPaths();

// Night-sky palette: ink-blue ground, starlight text, warm gold accent.
const COLORS = { bg: '#0B1020', ink: '#E8E4DA', muted: '#9AA3B5', accent: '#E9B86A' };

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
