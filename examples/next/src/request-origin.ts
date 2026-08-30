import "server-only";

import { headers } from "next/headers";

/**
 * The absolute origin of the current request, e.g. `https://example.com`.
 *
 * Read off the request rather than an environment variable. The examples that
 * need an absolute URL (a magic link, an OAuth redirect_uri) used to build it
 * from `NEXT_PUBLIC_URL`, which is empty on localhost and on any deployment
 * that does not set it, and produced links pointing at `https://`.
 */
export async function requestOrigin(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";

  // portless and Vercel both terminate TLS in front of the app, so trust the
  // proxy's header before guessing from the host.
  const forwardedProtocol = headerList.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const isPlainLocalhost = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const protocol = forwardedProtocol ?? (isPlainLocalhost ? "http" : "https");

  return `${protocol}://${host}`;
}
