import { t, type Locale } from '@blog/core/i18n';
import { renderOg } from '@blog/core/og';
import type { Post } from '@blog/core/posts';
import { ogPaths } from '@blog/core/routes';
import { SITE } from '@blog/core/site';
import type { APIContext } from 'astro';

export const getStaticPaths = () => ogPaths();

// Each theme passes its own palette here so share images match the theme.
const COLORS = { bg: '#0C0C0C', ink: '#E4DFD2', muted: '#9C978B', accent: '#F2B13C' };

export async function GET(context: APIContext) {
  const { locale, post } = context.props as { locale: Locale; post: Post };
  const png = await renderOg({
    title: post.data.title,
    kicker: `$ cat ./${post.section}/${post.slug} · ${t(locale, `type.${post.data.type}`)}`,
    site: `${SITE.origin.replace('https://', '')}`,
    colors: COLORS,
  });
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
}
