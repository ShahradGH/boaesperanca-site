export interface OAuthEnv {
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  OAUTH_STATE_SECRET?: string;
}

export const CANONICAL_ORIGIN = 'https://boaesperanca.net';
export const OAUTH_CALLBACK_URL = `${CANONICAL_ORIGIN}/api/callback`;
export const OAUTH_STATE_COOKIE = 'sveltia_oauth_state';
export const OAUTH_COOKIE_MAX_AGE_SECONDS = 600;

export const OAUTH_SECURITY_HEADERS: Record<string, string> = {
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
};

const encoder = new TextEncoder();

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex: string): Uint8Array | null {
  if (hex.length === 0 || hex.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(hex)) {
    return null;
  }
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function generateStateNonce(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

export function timingSafeEqual(a: string, b: string): boolean {
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);
  const maxLen = Math.max(bufA.length, bufB.length);
  let diff = bufA.length ^ bufB.length;
  for (let i = 0; i < maxLen; i += 1) {
    diff |= (bufA[i] ?? 0) ^ (bufB[i] ?? 0);
  }
  return diff === 0;
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

export async function signState(nonce: string, secret: string): Promise<string> {
  const key = await importHmacKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(nonce));
  return `${nonce}.${bytesToHex(new Uint8Array(signature))}`;
}

export async function verifySignedState(
  cookieValue: string,
  expectedState: string,
  secret: string,
): Promise<boolean> {
  const dotIndex = cookieValue.indexOf('.');
  if (dotIndex <= 0 || dotIndex === cookieValue.length - 1) {
    return false;
  }
  const cookieNonce = cookieValue.slice(0, dotIndex);
  const sigHex = cookieValue.slice(dotIndex + 1);
  if (sigHex.includes('.')) {
    return false;
  }
  const sigBytes = hexToBytes(sigHex);
  if (!sigBytes || sigBytes.length !== 32) {
    return false;
  }

  const key = await importHmacKey(secret);
  const signatureValid = await crypto.subtle.verify(
    'HMAC',
    key,
    sigBytes,
    encoder.encode(cookieNonce),
  );
  if (!signatureValid) {
    return false;
  }
  return timingSafeEqual(cookieNonce, expectedState);
}

export function parseCookies(cookieHeader: string | null): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) {
    return cookies;
  }
  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim();
    if (!trimmed) {
      continue;
    }
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex <= 0) {
      continue;
    }
    const name = trimmed.slice(0, eqIndex).trim();
    const rawValue = trimmed.slice(eqIndex + 1).trim();
    try {
      cookies[name] = decodeURIComponent(rawValue);
    } catch {
      cookies[name] = rawValue;
    }
  }
  return cookies;
}

export function buildStateCookieHeader(
  value: string,
  isHttps: boolean,
  maxAgeSeconds: number,
): string {
  const base = [
    `${OAUTH_STATE_COOKIE}=${maxAgeSeconds > 0 ? encodeURIComponent(value) : ''}`,
    'Path=/api',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (maxAgeSeconds === 0) {
    base.push('Expires=Thu, 01 Jan 1970 00:00:00 GMT');
  }
  if (isHttps) {
    base.push('Secure');
  }
  return base.join('; ');
}

export function safeJsonForInlineScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderOAuthConfigMissingResponse(
  request: Request,
  missingSecrets: string[],
): Response {
  const accept = (request.headers.get('accept') || '').toLowerCase();
  const wantsJson = accept.includes('application/json') && !accept.includes('text/html');
  const message =
    `GitHub OAuth is not configured yet for Boa Esperança CMS. Set ${missingSecrets.join(' and ')} ` +
    'in Cloudflare Pages project secrets (boaesperanca-site) and register ' +
    `${OAUTH_CALLBACK_URL} as the GitHub OAuth callback URL.`;

  if (wantsJson) {
    const body = request.method === 'HEAD'
      ? null
      : JSON.stringify({
          error: 'oauth_not_configured',
          message,
          missingSecrets,
          callbackUrl: OAUTH_CALLBACK_URL,
        });
    return new Response(body, {
      status: 503,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        ...OAUTH_SECURITY_HEADERS,
      },
    });
  }

  const secretListHtml = missingSecrets
    .map((name) => `<li><code>${escapeHtml(name)}</code></li>`)
    .join('');

  const html = `<!doctype html>
<html lang="en-GB">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex" />
    <title>GitHub OAuth Setup Required — Boa Esperança CMS</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #faf7f2; color: #1e293b; margin: 0; padding: 32px 16px; }
      main { max-width: 640px; margin: 0 auto; background: #ffffff; border: 1px solid #e5ddd0; border-top: 4px solid #103b66; border-radius: 12px; padding: 28px; }
      h1 { margin: 0 0 12px; font-size: 1.35rem; color: #103b66; }
      code, pre { background: #f1f5f9; border-radius: 4px; padding: 2px 6px; font-size: 0.9rem; }
      pre { padding: 12px; overflow-x: auto; }
      p, li { line-height: 1.6; }
    </style>
  </head>
  <body>
    <main>
      <h1>GitHub OAuth Not Configured (503)</h1>
      <p>The Sveltia CMS OAuth proxy is online, but the required Cloudflare Pages secret(s) are not yet configured for <code>boaesperanca-site</code>:</p>
      <ul>${secretListHtml}</ul>
      <p>Configure your GitHub OAuth App with callback URL <code>${escapeHtml(OAUTH_CALLBACK_URL)}</code> and set the secrets via Wrangler:</p>
      <pre>npx wrangler pages secret put GITHUB_CLIENT_ID --project-name=boaesperanca-site
npx wrangler pages secret put GITHUB_CLIENT_SECRET --project-name=boaesperanca-site</pre>
      <p><a href="/admin/">Return to Sveltia CMS</a> &middot; <a href="/">Boa Esperança Home</a></p>
    </main>
  </body>
</html>`;

  return new Response(request.method === 'HEAD' ? null : html, {
    status: 503,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      ...OAUTH_SECURITY_HEADERS,
    },
  });
}

export function renderCallbackHtmlResponse(opts: {
  statusCode: number;
  outcome: 'success' | 'error';
  payload: { token: string; provider: 'github' } | { error: string; provider: 'github' };
  heading: string;
  detail: string;
  clearCookieHeader?: string;
}): Response {
  const rawMessage = `authorization:github:${opts.outcome}:${JSON.stringify(opts.payload)}`;
  const safeMessageLiteral = safeJsonForInlineScript(rawMessage);
  const safeOriginLiteral = safeJsonForInlineScript(CANONICAL_ORIGIN);

  const html = `<!doctype html>
<html lang="en-GB">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex" />
    <title>${escapeHtml(opts.heading)} — Boa Esperança CMS</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #faf7f2; color: #1e293b; margin: 0; padding: 32px 16px; }
      main { max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e5ddd0; border-top: 4px solid #103b66; border-radius: 12px; padding: 24px; }
      h1 { margin: 0 0 10px; font-size: 1.25rem; color: #103b66; }
      p { line-height: 1.6; margin: 0 0 12px; }
    </style>
  </head>
  <body>
    <main>
      <h1>${escapeHtml(opts.heading)}</h1>
      <p>${escapeHtml(opts.detail)}</p>
      <p><a href="/admin/">Return to Sveltia CMS</a></p>
    </main>
    <script>
      (function () {
        var expectedOrigin = ${safeOriginLiteral};
        var message = ${safeMessageLiteral};
        if (!window.opener) {
          return;
        }
        function receiveMessage(event) {
          if (event.origin !== expectedOrigin) {
            return;
          }
          if (event.source && event.source !== window.opener) {
            return;
          }
          if (event.data !== "authorizing:github") {
            return;
          }
          window.removeEventListener("message", receiveMessage, false);
          window.opener.postMessage(message, event.origin);
        }
        window.addEventListener("message", receiveMessage, false);
        window.opener.postMessage("authorizing:github", expectedOrigin);
      })();
    </script>
  </body>
</html>`;

  const headers = new Headers({
    'Content-Type': 'text/html; charset=utf-8',
    ...OAUTH_SECURITY_HEADERS,
  });
  if (opts.clearCookieHeader) {
    headers.append('Set-Cookie', opts.clearCookieHeader);
  }

  return new Response(html, {
    status: opts.statusCode,
    headers,
  });
}
