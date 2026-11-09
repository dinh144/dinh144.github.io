import { unified } from '@astrojs/markdown-remark';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import { rehypeFootnotesI18n } from './rehype-footnotes-i18n';

/**
 * Shared Markdown pipeline for every theme (Astro 7: plugins go through the `unified` processor,
 * since Sätteri is the default). KaTeX for math, dual-theme Shiki for code:
 * `defaultColor: false` emits --shiki-light / --shiki-dark CSS variables on every token,
 * so each theme decides how code looks in light and dark mode.
 */
export const markdown = {
  processor: unified({ remarkPlugins: [remarkMath], rehypePlugins: [rehypeKatex, rehypeFootnotesI18n] }),
  shikiConfig: {
    themes: { light: 'github-light', dark: 'github-dark' },
    defaultColor: false as const,
    wrap: false,
  },
};

/** Vite settings every theme needs: keep the native resvg binding (OG images) out of the bundle. */
export const vite = {
  ssr: { external: ['@resvg/resvg-js'] },
  optimizeDeps: { exclude: ['@resvg/resvg-js'] },
};
