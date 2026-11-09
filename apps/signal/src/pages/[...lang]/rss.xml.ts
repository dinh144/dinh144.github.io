import type { Locale } from '@blog/core/i18n';
import { localePaths } from '@blog/core/routes';
import { rssResponse } from '@blog/core/rss';
import type { APIContext } from 'astro';

export const getStaticPaths = () => localePaths();

export const GET = (context: APIContext) => rssResponse(context, (context.props as { locale: Locale }).locale);
