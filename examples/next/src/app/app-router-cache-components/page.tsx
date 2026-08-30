import { Suspense } from "react";
import { cacheLife } from "next/cache";
import Link from "next/link";
import type { Metadata } from "next";

import * as css from "@/app/css";
import { Title } from "../title";
import { GetTheCode } from "../../get-the-code";
import { SessionPanel } from "./session-panel";

export const metadata: Metadata = {
  title: "🛠 iron-session examples: Cache Components",
};

/**
 * A cached component. No `cookies()` in here, and no session: `use cache`
 * refuses runtime APIs, and anything read in here would be shared between
 * visitors, which is the last thing you want for a session.
 *
 * The timestamp is the point of the demo. It is computed once when the cache
 * entry is filled, so it stops moving while the session panel below keeps
 * updating on every request.
 */
async function CachedPanel() {
  "use cache";
  // `max` keeps this entry until the next deploy. A shorter profile like
  // `hours` would go stale and be refilled in the background, which is fine in
  // production and only muddles the demo.
  cacheLife("max");

  const filledAt = new Date().toISOString();

  return (
    <div className="grid grid-cols-1 gap-2 p-6 border border-slate-500 rounded-md max-w-xl">
      <p className="text-lg">Cached, shared by everyone</p>
      <p>
        Cache entry filled at <code>{filledAt}</code>
      </p>
      <p className="text-sm text-slate-700 dark:text-slate-400">
        Reload the page: this does not change. It is the same HTML for every visitor.
      </p>
    </div>
  );
}

export default function CacheComponentsExample() {
  return (
    <main className="p-10 space-y-5">
      <Title subtitle="+ Cache Components (Next.js 16)" />

      <p className="italic max-w-xl">
        <u>How to test</u>: log in, then reload. The cached panel keeps its timestamp, the session
        panel updates every time.
      </p>

      {/* Prerendered at build time, no request needed. */}
      <CachedPanel />

      {/* The session lives in a cookie, so it is a dynamic hole: it streams in
          per request while everything around it is served from the prerender. */}
      <Suspense fallback={<p className="text-lg">Loading session...</p>}>
        <SessionPanel />
      </Suspense>

      <GetTheCode path="app/app-router-cache-components" />
      <HowItWorks />

      <p>
        <Link href="/" className={css.link}>
          ← All examples
        </Link>
      </p>
    </main>
  );
}

function HowItWorks() {
  return (
    <details className="max-w-2xl space-y-4">
      <summary className="cursor-pointer">How it works</summary>

      <ol className="list-decimal list-inside space-y-2">
        <li>
          <code>cacheComponents: true</code> is set in <code>next.config.js</code>, so a page can
          mix prerendered, cached and per-request content.
        </li>
        <li>
          The static shell and the <code>use cache</code> panel are prerendered. Neither one may
          call <code>cookies()</code>, so neither one may read a session.
        </li>
        <li>
          The session panel calls <code>getIronSession(await cookies(), ...)</code>, which makes it
          dynamic. It has to sit inside <code>&lt;Suspense&gt;</code>, otherwise the build fails
          rather than shipping one visitor&apos;s session to everybody.
        </li>
        <li>
          The login form uses <code>useActionState</code>, so a rejected username comes back as a
          message instead of an exception.
        </li>
        <li>
          <code>proxy.ts</code> refreshes <code>lastSeen</code> on every request through{" "}
          <code>nextProxyCookies</code>, and the panel below shows the value written by that same
          request.
        </li>
      </ol>
    </details>
  );
}
