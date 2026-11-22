# Boa Esperança (`boaesperanca.net`)

Static cultural and community website built with **Astro** and **Sveltia CMS**, deployed on **Cloudflare Pages**.

## Features

- Portuguese cultural and community home page (`src/pages/index.astro`)
- Preserved legacy WordPress post (`/hello-world/`) and page (`/sample-page/`)
- Legacy permalink and `/wp-content/uploads/*` 301 redirects (`public/_redirects`)
- RSS feed (`/rss.xml`)
- Git-backed Sveltia CMS (`/admin/`) targeting `ShahradGH/boaesperanca-site`

## Local Verification

```bash
npm install
npm run build
npm test
```
