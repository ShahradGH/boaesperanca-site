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
- **Git-Backed Editorial CMS**: **Sveltia CMS** (`/admin/`) authenticates via GitHub OAuth and commits content updates directly to `ShahradGH/boaesperanca-site` (`main` branch).
- **Permalink & Asset Continuity**: `public/_redirects` preserves legacy WordPress routes (`/2016/05/10/hello-world/`, `/feed/`, `/wp-content/uploads/*`) with deterministic `301` redirects.
- **Verification & Deployment**:
  - `npm run build` compiles static output into `dist/`.
  - `npm test` validates expected routes, RSS feed, Sveltia CMS config, `_redirects`, zero-byte absence, and Zero-Leak IPv4/secret hygiene.
  - Production deploys run via `.github/workflows/deploy.yml` using `npx wrangler pages deploy dist --project-name=boaesperanca-site`.
