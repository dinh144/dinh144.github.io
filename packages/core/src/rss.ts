import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { t, type Locale } from './i18n';
import { getPosts } from './posts';
import { paths } from './routes';
import { SITE } from './site';

/** One feed per locale; untranslated posts stay out of the English feed. */
export async function rssResponse(context: APIContext, locale: Locale) {
  const posts = (await getPosts(locale)).filter((post) => !post.fallback);
  return rss({
    title: SITE.name,
    description:
      locale === 'vi'
        ? 'Ghi chép về lập trình, máy học và những gì mình học được mỗi tuần.'
        : 'Notes on programming, machine learning and what I learn each week.',
    site: context.site ?? SITE.origin,
    items: posts.map((post) => ({
      title: post.data.type === 'note' ? `${t(locale, 'type.note')}: ${post.data.title}` : post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: post.data.type === 'link' && post.data.link ? post.data.link : paths.post(post),
      categories: post.data.tags,
    })),
    customData: `<language>${locale === 'vi' ? 'vi-VN' : 'en-GB'}</language>`,
  });
}
