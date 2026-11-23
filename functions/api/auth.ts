import {
  buildStateCookieHeader,
  generateStateNonce,
  OAUTH_CALLBACK_URL,
  OAUTH_COOKIE_MAX_AGE_SECONDS,
  OAUTH_SECURITY_HEADERS,
  type OAuthEnv,
  renderOAuthConfigMissingResponse,
  signState,
} from '../../lib/oauth.ts';

/**
 * Initiates the GitHub OAuth flow for Sveltia CMS.
 * Sets an HttpOnly SameSite=Lax (HMAC-signed when client secret is available) CSRF state cookie
 * and redirects to GitHub's authorise endpoint.
 */
export const onRequest: PagesFunction<OAuthEnv> = async (context) => {
  const { request, env } = context;

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: {
        Allow: 'GET, HEAD',
        ...OAUTH_SECURITY_HEADERS,
      },
    });
  }

  const clientId = env.GITHUB_CLIENT_ID?.trim();
  if (!clientId) {
    const missing = ['GITHUB_CLIENT_ID'];
    if (!env.GITHUB_CLIENT_SECRET?.trim()) {
      missing.push('GITHUB_CLIENT_SECRET');
    }
    return renderOAuthConfigMissingResponse(request, missing);
  }

  const url = new URL(request.url);
  const isHttps = url.protocol === 'https:';
  const nonce = generateStateNonce();
  const signingSecret = env.OAUTH_STATE_SECRET?.trim() || env.GITHUB_CLIENT_SECRET?.trim();
  const cookieValue = signingSecret ? await signState(nonce, signingSecret) : nonce;

  const authorizeUrl = new URL('https://github.com/login/oauth/authorize');
  authorizeUrl.searchParams.set('client_id', clientId);
  authorizeUrl.searchParams.set('redirect_uri', OAUTH_CALLBACK_URL);
  authorizeUrl.searchParams.set('scope', 'repo,user');
  authorizeUrl.searchParams.set('state', nonce);

  const headers = new Headers({
    Location: authorizeUrl.toString(),
    ...OAUTH_SECURITY_HEADERS,
  });
  headers.append(
    'Set-Cookie',
    buildStateCookieHeader(cookieValue, isHttps, OAUTH_COOKIE_MAX_AGE_SECONDS),
  );

  return new Response(null, {
    status: 302,
    headers,
  });
};
