import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://dinh144.github.io',
  base: '/',
  trailingSlash: 'always',
  build: { format: 'directory' },
});
