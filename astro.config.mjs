import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://boaesperanca.net',
  output: 'static',
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/404') && !page.includes('/admin'),
    }),
  ],
});
