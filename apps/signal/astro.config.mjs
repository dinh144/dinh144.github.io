import sitemap from '@astrojs/sitemap';
import { markdown, vite } from '@blog/core/markdown';
import { defineConfig } from 'astro/config';

// Each lab theme is served under /lab/<name>; the winner later moves to the root (base '/').
const LAB_NAME = 'signal';

export default defineConfig({
  site: 'https://dinh144.github.io',
  base: `/lab/${LAB_NAME}`,
  trailingSlash: 'always',
  build: { format: 'directory' },
  markdown,
  vite,
  integrations: [sitemap({ i18n: { defaultLocale: 'vi', locales: { vi: 'vi-VN', en: 'en-GB' } } })],
});
