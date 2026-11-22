import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://boaesperanca.net',
  output: 'static',
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
});
