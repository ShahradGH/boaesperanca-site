# Boa Esperança (`boaesperanca.net`)

Static cultural and community website built with **Astro** and **Sveltia CMS**, deployed on **Cloudflare Pages** (`Zero-VPS PaaS`).

---

## Architecture & Capabilities

- **Static Edge Hosting**: Built cleanly into static HTML/XML/assets (`output: 'static'` in `astro.config.mjs`) and served globally via **Cloudflare Pages** (`https://boaesperanca.net`), retiring the legacy PHP/MariaDB runtime.
- **Portuguese Cultural & Community Home**: Main page (`src/pages/index.astro`), preserved editorial post (`/hello-world/`) and page (`/sample-page/`), and static RSS feed (`/rss.xml`).
- **Legacy Permalink & Upload Continuity**: `public/_redirects` emits deterministic `301` redirects for `/wp-content/uploads/*`, `/2016/05/10/hello-world/`, and `/feed/`.
- **Git-Backed Sveltia CMS (`/admin/`)**: Configured in `public/admin/config.yml` against `ShahradGH/boaesperanca-site` (`main` branch) for browser-based markdown and asset publishing without a database or origin server.

---

## Local Verification & Cloudflare Pages Deployment

```bash
npm install
npm run build
npm test
```

### Deploy to Cloudflare Pages
```bash
npx wrangler pages deploy dist --project-name=boaesperanca-site
```
Automated verification (`npm run build && npm test`) and guarded Cloudflare Pages deployment run on every push to `main` via [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

---

## Licence

MIT — see [`LICENSE`](LICENSE).
