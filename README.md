# Boa Esperança (`boaesperanca.net`)

Static cultural and community website built with **Astro** and **Sveltia CMS**, deployed on **Cloudflare Pages** (`Zero-VPS PaaS`) with edge Cloudflare Pages Functions.

---

## Architecture & Capabilities

- **Static Edge Hosting**: Built cleanly into static HTML/XML/assets (`output: 'static'` in `astro.config.mjs`) and served globally via **Cloudflare Pages** (`https://boaesperanca.net`), retiring the legacy PHP/MariaDB runtime.
- **Canonical Apex Edge Redirect**: `functions/_middleware.ts` enforces a `301` redirect from `www.boaesperanca.net` to `https://boaesperanca.net` at the Cloudflare edge.
- **GitHub OAuth Proxy for Sveltia CMS**: `functions/api/auth.ts` and `functions/api/callback.ts` (backed by shared helpers in `lib/oauth.ts`) handle HMAC-signed CSRF state cookies and GitHub token exchange for `/admin/` without an external server.
- **SEO, Security Headers & 404 Parity**: `@astrojs/sitemap` (`/sitemap-index.xml`), `public/robots.txt`, canonical/OpenGraph/Twitter meta tags, `src/pages/404.astro`, and OWASP headers + immutable asset caching in `public/_headers` (keeping `Cross-Origin-Opener-Policy: same-origin-allow-popups` for OAuth popup messaging).
- **Portuguese Cultural & Community Home**: Main page (`src/pages/index.astro`), preserved editorial post (`/hello-world/`) and page (`/sample-page/`), and static RSS feed (`/rss.xml`).
- **Legacy Permalink & Upload Continuity**: `public/_redirects` emits deterministic `301` redirects for `/wp-content/uploads/*`, `/2016/05/10/hello-world/`, and `/feed/`.
- **Git-Backed Sveltia CMS (`/admin/`)**: Configured in `public/admin/config.yml` against `ShahradGH/boaesperanca-site` (`main` branch) using pinned `@sveltia/cms@0.271.0`.

---

## Cloudflare Pages Secrets (Sveltia CMS GitHub OAuth)

Register a GitHub OAuth App with callback URL `https://boaesperanca.net/api/callback` and store its credentials as Cloudflare Pages secrets:

```bash
npx wrangler pages secret put GITHUB_CLIENT_ID --project-name=boaesperanca-site
npx wrangler pages secret put GITHUB_CLIENT_SECRET --project-name=boaesperanca-site
```

---

## Local Verification & Cloudflare Pages Deployment

```bash
npm install
npm run typecheck
npm run build
npm test
```

### Deploy to Cloudflare Pages

```bash
npx wrangler pages deploy dist --project-name=boaesperanca-site
```

Automated verification (`npm run typecheck`, `wrangler pages functions build`, `npm run build`, and `npm test`) runs via [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

---

## Licence

MIT — see [`LICENSE`](LICENSE).
