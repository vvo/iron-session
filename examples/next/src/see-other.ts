/**
 * A 303 redirect to a path on this site.
 *
 * `Response.redirect` needs an absolute url, and building one from
 * `request.nextUrl.origin` or `new URL(request.url).origin` returns the origin
 * the app is listening on, not the one the browser asked for. Behind the
 * portless proxy that is `https://localhost:<dev port>`, so `pnpm dev` sent the
 * browser to speak https to Next's plain http port and every one of these
 * redirects ended in `ERR_SSL_PROTOCOL_ERROR`. A relative `Location` is
 * resolved against the request url by the browser, so it is right behind a
 * proxy and on Vercel both.
 *
 * 303 rather than `redirect()` from `next/navigation`, which answers a POST
 * with 307 and re-submits it to the target:
 * https://github.com/vercel/next.js/issues/51592#issuecomment-1810212676
 */
export function seeOther(path: string): Response {
  return new Response(null, { status: 303, headers: { Location: path } });
}
