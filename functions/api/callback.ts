import {
  buildStateCookieHeader,
  OAUTH_CALLBACK_URL,
  OAUTH_SECURITY_HEADERS,
  OAUTH_STATE_COOKIE,
  type OAuthEnv,
  parseCookies,
  renderCallbackHtmlResponse,
  verifySignedState,
} from '../../lib/oauth.ts';

interface GitHubAccessTokenResponse {
  access_token?: string;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

/**
 * Completes the GitHub OAuth flow for Sveltia CMS.
 * Verifies the state cookie in constant time, exchanges the authorisation code
 * for an access token, and relays the result via window.opener.postMessage.
 */
export const onRequest: PagesFunction<OAuthEnv> = async (context) => {
  const { request, env } = context;

  if (request.method !== 'GET') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: {
        Allow: 'GET',
        ...OAUTH_SECURITY_HEADERS,
      },
    });
  }

  const url = new URL(request.url);
  const isHttps = url.protocol === 'https:';
  const clearCookieHeader = buildStateCookieHeader('', isHttps, 0);

  const clientId = env.GITHUB_CLIENT_ID?.trim();
  const clientSecret = env.GITHUB_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    return renderCallbackHtmlResponse({
      statusCode: 503,
      outcome: 'error',
      payload: {
        error: 'GitHub OAuth secrets (GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET) are not configured on Cloudflare Pages.',
        provider: 'github',
      },
      heading: 'GitHub OAuth Not Configured',
      detail: 'Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET on Cloudflare Pages before signing in.',
      clearCookieHeader,
    });
  }

  const oauthError = url.searchParams.get('error');
  if (oauthError) {
    const errorDescription = url.searchParams.get('error_description') || oauthError;
    return renderCallbackHtmlResponse({
      statusCode: 400,
      outcome: 'error',
      payload: {
        error: errorDescription,
        provider: 'github',
      },
      heading: 'GitHub Authorisation Declined',
      detail: errorDescription,
      clearCookieHeader,
    });
  }

  const code = url.searchParams.get('code')?.trim();
  const state = url.searchParams.get('state')?.trim();
  if (!code || !state) {
    return renderCallbackHtmlResponse({
      statusCode: 400,
      outcome: 'error',
      payload: {
        error: 'Missing OAuth code or state query parameter.',
        provider: 'github',
      },
      heading: 'Invalid OAuth Callback',
      detail: 'Required OAuth parameters were missing from the GitHub callback request.',
      clearCookieHeader,
    });
  }

  const cookies = parseCookies(request.headers.get('cookie'));
  const stateCookie = cookies[OAUTH_STATE_COOKIE];
  if (!stateCookie) {
    return renderCallbackHtmlResponse({
      statusCode: 403,
      outcome: 'error',
      payload: {
        error: 'Missing OAuth state cookie. Please retry signing in from Sveltia CMS.',
        provider: 'github',
      },
      heading: 'Invalid OAuth Session',
      detail: 'Your OAuth state cookie was absent or expired. Please retry signing in.',
      clearCookieHeader,
    });
  }

  const signingSecret = env.OAUTH_STATE_SECRET?.trim() || clientSecret;
  const stateValid = await verifySignedState(stateCookie, state, signingSecret);
  if (!stateValid) {
    return renderCallbackHtmlResponse({
      statusCode: 403,
      outcome: 'error',
      payload: {
        error: 'OAuth state verification failed. Please retry signing in.',
        provider: 'github',
      },
      heading: 'State Verification Failed',
      detail: 'The OAuth state signature or nonce did not match. Please retry signing in.',
      clearCookieHeader,
    });
  }

  let tokenResponse: Response;
  try {
    tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'boaesperanca-site-oauth',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: OAUTH_CALLBACK_URL,
      }),
    });
  } catch {
    return renderCallbackHtmlResponse({
      statusCode: 502,
      outcome: 'error',
      payload: {
        error: 'Failed to reach GitHub OAuth token endpoint.',
        provider: 'github',
      },
      heading: 'Upstream Connection Error',
      detail: 'Could not reach GitHub to complete token exchange. Please retry.',
      clearCookieHeader,
    });
  }

  if (!tokenResponse.ok) {
    return renderCallbackHtmlResponse({
      statusCode: 502,
      outcome: 'error',
      payload: {
        error: `GitHub OAuth token exchange failed with status ${tokenResponse.status}.`,
        provider: 'github',
      },
      heading: 'Token Exchange Failed',
      detail: `GitHub returned HTTP ${tokenResponse.status} during token exchange.`,
      clearCookieHeader,
    });
  }

  let tokenData: GitHubAccessTokenResponse;
  try {
    tokenData = (await tokenResponse.json()) as GitHubAccessTokenResponse;
  } catch {
    return renderCallbackHtmlResponse({
      statusCode: 502,
      outcome: 'error',
      payload: {
        error: 'GitHub OAuth token endpoint returned malformed JSON.',
        provider: 'github',
      },
      heading: 'Malformed Token Response',
      detail: 'GitHub returned an unreadable token response.',
      clearCookieHeader,
    });
  }

  if (tokenData.error || !tokenData.access_token) {
    const errorMessage =
      tokenData.error_description ||
      tokenData.error ||
      'GitHub did not issue an access token.';
    return renderCallbackHtmlResponse({
      statusCode: 400,
      outcome: 'error',
      payload: {
        error: errorMessage,
        provider: 'github',
      },
      heading: 'GitHub Token Error',
      detail: errorMessage,
      clearCookieHeader,
    });
  }

  return renderCallbackHtmlResponse({
    statusCode: 200,
    outcome: 'success',
    payload: {
      token: tokenData.access_token,
      provider: 'github',
    },
    heading: 'Authentication Complete',
    detail: 'Returning your GitHub session to Boa Esperança Sveltia CMS. You may close this window if it does not close automatically.',
    clearCookieHeader,
  });
};
