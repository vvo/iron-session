import { Suspense } from "react";
import { cacheLife } from "next/cache";

import { getSession } from "../../session";
import { LoginForm } from "./login-form";

/**
 * A `use cache` component. It must not read the session: runtime APIs are
 * rejected in here, and whatever it renders is shared between visitors.
 *
 * The counter is what the tests assert on. It runs once when the cache entry is
 * filled, so it has to stay put across reloads while the session panel below
 * changes on every request. If a session read ever leaked into a cached
 * component, this is the assertion that would catch it.
 */
async function CachedPanel() {
  "use cache";
  // `max`, not `hours`: a shorter profile goes stale during the run and Next
  // serves the stale value while revalidating behind it, so the timestamp can
  // change mid-test for reasons that have nothing to do with sessions.
  cacheLife("max");

  return <p data-testid="cached-at">{Date.now()}</p>;
}

export default function CachePage() {
  return (
    <main>
      <CachedPanel />

      <Suspense fallback={<p data-testid="loading">loading</p>}>
        <SessionPanel />
      </Suspense>

      <a href="/" data-testid="to-home">
        back
      </a>
    </main>
  );
}

/** The dynamic hole: reads a cookie, so it cannot be prerendered. */
async function SessionPanel() {
  const session = await getSession();

  return (
    <>
      <p data-testid="username">{session.username ?? "anonymous"}</p>
      <p data-testid="last-seen">{session.lastSeen ?? "never"}</p>
      <LoginForm />
    </>
  );
}
