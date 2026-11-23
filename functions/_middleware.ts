/**
 * Canonical apex redirect middleware for Cloudflare Pages.
 * Redirects www.boaesperanca.net -> https://boaesperanca.net with HTTP 301 at the edge.
 */
export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  if (url.hostname.toLowerCase() === 'www.boaesperanca.net') {
    return Response.redirect(`https://boaesperanca.net${url.pathname}${url.search}`, 301);
  }
  return context.next();
};
