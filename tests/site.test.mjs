import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { onRequest as middlewareOnRequest } from '../functions/_middleware.ts';
import { onRequest as authOnRequest } from '../functions/api/auth.ts';
import { onRequest as callbackOnRequest } from '../functions/api/callback.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const distDir = path.join(repoRoot, 'dist');

function walkFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkFiles(full));
    } else {
      out.push(full);
    }
  }
  return out;
}

function makeContext(request, env = {}, nextHandler = async () => new Response('ok', { status: 200 })) {
  return {
    request,
    env,
    params: {},
    data: {},
    functionPath: '',
    waitUntil: () => {},
    passThroughOnException: () => {},
    next: nextHandler,
  };
}

describe('boaesperanca-site static build and Zero-Leak validation', () => {
  it('generates expected static routes, sitemap, robots, 404, security headers, RSS feed, Sveltia CMS config, and redirects in dist/', () => {
    const requiredDistFiles = [
      'index.html',
      'hello-world/index.html',
      'sample-page/index.html',
      '404.html',
      'rss.xml',
      'sitemap-index.xml',
      'sitemap-0.xml',
      'robots.txt',
      'admin/index.html',
      'admin/config.yml',
      'uploads/boa-esperanca-crest.svg',
      'uploads/uploads-manifest.json',
      '_redirects',
      '_headers',
    ];
    for (const rel of requiredDistFiles) {
      const full = path.join(distDir, rel);
      assert.equal(fs.existsSync(full), true, `Missing dist/${rel}`);
    }

    const indexHtml = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');
    assert.match(indexHtml, /<link rel="canonical" href="https:\/\/boaesperanca\.net\/"/);
    assert.match(indexHtml, /<meta property="og:type" content="website"/);
    assert.match(indexHtml, /<meta property="og:url" content="https:\/\/boaesperanca\.net\/"/);
    assert.match(indexHtml, /<meta name="twitter:card" content="summary"/);

    const helloHtml = fs.readFileSync(path.join(distDir, 'hello-world', 'index.html'), 'utf8');
    assert.match(helloHtml, /Hello world!/);
    assert.match(helloHtml, /Welcome to WordPress\. This is your first post\./);
    assert.match(helloHtml, /<link rel="canonical" href="https:\/\/boaesperanca\.net\/hello-world\/"/);
    assert.match(helloHtml, /<meta property="og:type" content="article"/);
    assert.match(helloHtml, /<meta property="article:published_time" content="2016-05-10T03:48:21\.000Z"/);

    const sampleHtml = fs.readFileSync(path.join(distDir, 'sample-page', 'index.html'), 'utf8');
    assert.match(sampleHtml, /Sample Page/);
    assert.match(sampleHtml, /XYZ Doohickey Company/);
    assert.match(sampleHtml, /<link rel="canonical" href="https:\/\/boaesperanca\.net\/sample-page\/"/);

    const notFoundHtml = fs.readFileSync(path.join(distDir, '404.html'), 'utf8');
    assert.match(notFoundHtml, /Página não encontrada/);
    assert.match(notFoundHtml, /<meta name="robots" content="noindex"/);

    const sitemapIndex = fs.readFileSync(path.join(distDir, 'sitemap-index.xml'), 'utf8');
    assert.match(sitemapIndex, /https:\/\/boaesperanca\.net\/sitemap-0\.xml/);

    const sitemapUrls = fs.readFileSync(path.join(distDir, 'sitemap-0.xml'), 'utf8');
    assert.match(sitemapUrls, /https:\/\/boaesperanca\.net\//);
    assert.match(sitemapUrls, /https:\/\/boaesperanca\.net\/hello-world\//);
    assert.match(sitemapUrls, /https:\/\/boaesperanca\.net\/sample-page\//);
    assert.equal(sitemapUrls.includes('/404'), false, 'Sitemap must exclude 404');
    assert.equal(sitemapUrls.includes('/admin'), false, 'Sitemap must exclude /admin');

    const robots = fs.readFileSync(path.join(distDir, 'robots.txt'), 'utf8');
    assert.match(robots, /User-agent: \*/);
    assert.match(robots, /Allow: \//);
    assert.match(robots, /Disallow: \/admin\//);
    assert.match(robots, /Sitemap: https:\/\/boaesperanca\.net\/sitemap-index\.xml/);

    const headers = fs.readFileSync(path.join(distDir, '_headers'), 'utf8');
    assert.match(headers, /Strict-Transport-Security: max-age=31536000; includeSubDomains; preload/);
    assert.match(headers, /X-Content-Type-Options: nosniff/);
    assert.match(headers, /X-Frame-Options: SAMEORIGIN/);
    assert.match(headers, /Referrer-Policy: strict-origin-when-cross-origin/);
    assert.match(headers, /Permissions-Policy: camera=\(\), microphone=\(\), geolocation=\(\)/);
    assert.match(headers, /Cross-Origin-Opener-Policy: same-origin-allow-popups/);
    assert.match(headers, /\/_astro\/\*/);
    assert.match(headers, /\/uploads\/\*/);
    assert.match(headers, /Cache-Control: public, max-age=31536000, immutable/);

    const rss = fs.readFileSync(path.join(distDir, 'rss.xml'), 'utf8');
    assert.match(rss, /<rss/);
    assert.match(rss, /Hello world!/);

    const redirects = fs.readFileSync(path.join(distDir, '_redirects'), 'utf8');
    assert.match(redirects, /\/wp-content\/uploads\/\* \/uploads\/:splat 301/);

    const cmsHtml = fs.readFileSync(path.join(distDir, 'admin', 'index.html'), 'utf8');
    assert.match(
      cmsHtml,
      /https:\/\/unpkg\.com\/@sveltia\/cms@\d+\.\d+\.\d+\/dist\/sveltia-cms\.js/,
      'Sveltia CMS script must be pinned to a published npm version',
    );

    const cmsCfg = fs.readFileSync(path.join(distDir, 'admin', 'config.yml'), 'utf8');
    assert.match(cmsCfg, /ShahradGH\/boaesperanca-site/);
    assert.match(cmsCfg, /base_url:\s*https:\/\/boaesperanca\.net/);
    assert.match(cmsCfg, /auth_endpoint:\s*api\/auth/);
  });

  it('contains zero 0-byte files and zero IPv4/secret leaks in dist/ and functions/', () => {
    const files = walkFiles(distDir);
    assert.ok(files.length > 0);
    for (const f of files) {
      const stat = fs.statSync(f);
      assert.ok(stat.size > 0, `Zero-byte file detected in dist/: ${path.relative(distDir, f)}`);
      if (/\.(html|xml|yml|json|svg|txt)$/i.test(f) || path.basename(f) === '_redirects' || path.basename(f) === '_headers') {
        const text = fs.readFileSync(f, 'utf8');
        assert.equal(/\b\d{1,3}(\.\d{1,3}){3}\b/.test(text), false, `IPv4 literal in ${path.relative(distDir, f)}`);
      }
    }

    for (const dir of [path.join(repoRoot, 'functions'), path.join(repoRoot, 'lib')]) {
      for (const f of walkFiles(dir)) {
        const text = fs.readFileSync(f, 'utf8');
        assert.equal(/\b\d{1,3}(\.\d{1,3}){3}\b/.test(text), false, `IPv4 literal in ${path.relative(repoRoot, f)}`);
      }
    }
  });
});

describe('Cloudflare Pages Functions: canonical redirect & GitHub OAuth proxy', () => {
  it('redirects www.boaesperanca.net -> https://boaesperanca.net with 301 and passes apex through', async () => {
    const wwwReq = new Request('https://WWW.BOAESPERANCA.NET/hello-world/?utm=1');
    let nextCalled = false;
    const res = await middlewareOnRequest(
      makeContext(wwwReq, {}, async () => {
        nextCalled = true;
        return new Response('should-not-run');
      }),
    );
    assert.equal(nextCalled, false);
    assert.equal(res.status, 301);
    assert.equal(res.headers.get('location'), 'https://boaesperanca.net/hello-world/?utm=1');

    const apexReq = new Request('https://boaesperanca.net/');
    const apexRes = await middlewareOnRequest(
      makeContext(apexReq, {}, async () => {
        nextCalled = true;
        return new Response('apex-ok', { status: 200 });
      }),
    );
    assert.equal(nextCalled, true);
    assert.equal(apexRes.status, 200);
    assert.equal(await apexRes.text(), 'apex-ok');
  });

  it('returns clear 503 HTML or JSON from /api/auth when GITHUB_CLIENT_ID is unset', async () => {
    const htmlRes = await authOnRequest(
      makeContext(new Request('https://boaesperanca.net/api/auth'), {}),
    );
    assert.equal(htmlRes.status, 503);
    assert.match(htmlRes.headers.get('content-type') || '', /text\/html/);
    assert.equal(htmlRes.headers.get('cross-origin-opener-policy'), 'same-origin-allow-popups');
    const htmlBody = await htmlRes.text();
    assert.match(htmlBody, /GITHUB_CLIENT_ID/);
    assert.match(htmlBody, /GITHUB_CLIENT_SECRET/);

    const jsonRes = await authOnRequest(
      makeContext(
        new Request('https://boaesperanca.net/api/auth', {
          headers: { Accept: 'application/json' },
        }),
        {},
      ),
    );
    assert.equal(jsonRes.status, 503);
    assert.match(jsonRes.headers.get('content-type') || '', /application\/json/);
    const jsonBody = await jsonRes.json();
    assert.equal(jsonBody.error, 'oauth_not_configured');
    assert.ok(jsonBody.missingSecrets.includes('GITHUB_CLIENT_ID'));
  });

  it('completes OAuth round-trip across /api/auth -> /api/callback with signed state cookie and postMessage', async () => {
    const env = {
      GITHUB_CLIENT_ID: 'test-client-id',
      GITHUB_CLIENT_SECRET: 'test-client-secret-hmac-key',
    };

    const authRes = await authOnRequest(
      makeContext(new Request('https://boaesperanca.net/api/auth'), env),
    );
    assert.equal(authRes.status, 302);
    const location = authRes.headers.get('location');
    assert.ok(location);
    const ghUrl = new URL(location);
    assert.equal(ghUrl.origin, 'https://github.com');
    assert.equal(ghUrl.pathname, '/login/oauth/authorize');
    assert.equal(ghUrl.searchParams.get('client_id'), 'test-client-id');
    assert.equal(ghUrl.searchParams.get('redirect_uri'), 'https://boaesperanca.net/api/callback');
    assert.equal(ghUrl.searchParams.get('scope'), 'repo,user');

    const state = ghUrl.searchParams.get('state');
    assert.ok(state && state.length >= 32);

    const setCookie = authRes.headers.get('set-cookie');
    assert.ok(setCookie);
    assert.match(setCookie, /^sveltia_oauth_state=/);
    assert.match(setCookie, /HttpOnly/);
    assert.match(setCookie, /SameSite=Lax/);
    assert.match(setCookie, /Secure/);
    const cookiePair = setCookie.split(';')[0];

    // Reject state mismatch
    const mismatchRes = await callbackOnRequest(
      makeContext(
        new Request('https://boaesperanca.net/api/callback?code=abc&state=wrong-state', {
          headers: { Cookie: cookiePair },
        }),
        env,
      ),
    );
    assert.equal(mismatchRes.status, 403);
    const mismatchHtml = await mismatchRes.text();
    assert.match(mismatchHtml, /authorization:github:error:/);
    assert.match(mismatchRes.headers.get('set-cookie') || '', /Max-Age=0/);

    // Exchange valid code with mocked GitHub token endpoint
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
      assert.equal(String(input), 'https://github.com/login/oauth/access_token');
      assert.equal(init.method, 'POST');
      const sentBody = JSON.parse(init.body);
      assert.equal(sentBody.client_id, 'test-client-id');
      assert.equal(sentBody.client_secret, 'test-client-secret-hmac-key');
      assert.equal(sentBody.code, 'valid-oauth-code');
      assert.equal(sentBody.redirect_uri, 'https://boaesperanca.net/api/callback');
      return new Response(
        JSON.stringify({
          access_token: 'gho_mocked_token_value',
          token_type: 'bearer',
          scope: 'repo,user',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    };

    try {
      const cbRes = await callbackOnRequest(
        makeContext(
          new Request(
            `https://boaesperanca.net/api/callback?code=valid-oauth-code&state=${encodeURIComponent(state)}`,
            { headers: { Cookie: cookiePair } },
          ),
          env,
        ),
      );
      assert.equal(cbRes.status, 200);
      assert.equal(cbRes.headers.get('cross-origin-opener-policy'), 'same-origin-allow-popups');
      assert.equal(cbRes.headers.get('cache-control'), 'no-store');
      assert.match(cbRes.headers.get('set-cookie') || '', /Max-Age=0/);

      const html = await cbRes.text();
      assert.match(html, /authorizing:github/);
      assert.match(
        html,
        /authorization:github:success:\{\\"token\\":\\"gho_mocked_token_value\\",\\"provider\\":\\"github\\"\}/,
      );
      assert.equal(
        html.split('<script>')[0].includes('gho_mocked_token_value'),
        false,
        'Visible HTML body must not render the OAuth token',
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('escapes </script> payloads against XSS in /api/callback error responses', async () => {
    const env = {
      GITHUB_CLIENT_ID: 'test-client-id',
      GITHUB_CLIENT_SECRET: 'test-client-secret-hmac-key',
    };
    const malicious = '</script><script>alert(1)</script>';
    const res = await callbackOnRequest(
      makeContext(
        new Request(
          `https://boaesperanca.net/api/callback?error=access_denied&error_description=${encodeURIComponent(malicious)}`,
        ),
        env,
      ),
    );
    assert.equal(res.status, 400);
    const html = await res.text();
    assert.equal(html.includes('</script><script>'), false);
    assert.match(html, /\\u003c\/script\\u003e/);
    assert.match(html, /authorization:github:error:/);
  });
});
