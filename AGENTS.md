# Sovereign Conductor & Cloudflare Pages Operating Guidelines

Author: Shahrad Alerasoul | Platform: ShahradGH Sovereign Estate (`boaesperanca-site`)

---

## 1. Governance & Legal Compliance Engine

- **Personal Identity & Provenance**: All commits must use personal git credentials (`ShahradAlerasoul <4907864+ShahradGH@users.noreply.github.com>`). Never include employer keywords, client identifiers, secrets, tokens, or non-RFC5737/non-RFC1918 IPv4 literals.
- **Core Business Hours Compliance**: Commencing **30 November 2026**, commits and automated writes are prohibited during Monday–Friday `08:30–17:30 UK` local time.
- **Zero-Leak Invariant**: Never leak private orchestrator endpoints, internal portal URLs, or host IPs.
- **British English**: Author all repository documentation, commit messages, and technical prose in British English (`standardise`, `optimise`, `artefact`, `licence`).

---

## 2. Cloudflare Zero-VPS PaaS Architecture (`boaesperanca.net`)

- **Hosting Platform**: Static **Astro** site (`output: 'static'`) deployed to **Cloudflare Pages** at `https://boaesperanca.net`. Legacy WordPress/MariaDB runtime assumptions are permanently retired.
- **Git-Backed Editorial CMS**: **Sveltia CMS** (`/admin/`, pinned version) authenticates via the Cloudflare Pages Functions GitHub OAuth proxy (`functions/api/auth.ts`, `functions/api/callback.ts`) and commits content updates directly to `ShahradGH/boaesperanca-site` (`main` branch).
- **Canonical Redirect, SEO & Security Headers**: `functions/_middleware.ts` enforces `301` `www.boaesperanca.net` -> `boaesperanca.net`; `public/_headers` enforces OWASP security headers (`Cross-Origin-Opener-Policy: same-origin-allow-popups` aligned with OAuth popups) and immutable cache rules; `@astrojs/sitemap`, `public/robots.txt`, `src/pages/404.astro`, and `public/_redirects` preserve search and permalink continuity.
- **Verification & Deployment**:
  - `npm run typecheck` checks `functions/` and `lib/` against `@cloudflare/workers-types`.
  - `npm run build` compiles static output (including `sitemap-index.xml` and `404.html`) into `dist/`.
  - `npm test` validates expected routes, SEO/security artefacts, Pages Functions handlers, zero-byte absence, and Zero-Leak IPv4/secret hygiene.
  - Production deploys run via `npx wrangler pages deploy dist --project-name=boaesperanca-site` (automatically bundling `functions/`).
