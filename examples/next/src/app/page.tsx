import Link from "next/link";
import type { Metadata } from "next";

import * as css from "@/app/css";

import { ExampleGrid, type Example } from "./example-card";

export const metadata: Metadata = {
  title: "🛠 iron-session examples",
  description:
    "Cookie-based sessions for Next.js: server actions, cache components, route handlers and proxy.",
};

/**
 * The order here is the recommendation. Whatever sits first is what someone
 * arriving from the Next.js docs will copy, so it has to be the shape those
 * docs teach: a Server Action writes the session, and the page that needs it
 * reads it next to the data.
 */
const appRouter: Example[] = [
  {
    href: "/app-router-server-component-and-action",
    title: "Server Components and Server Actions",
    when: "The default. A form posts to a Server Action, the action writes the session, the page reads it on the server.",
    tags: ["Server Actions", "Data Access Layer", "Protected route"],
  },
  {
    href: "/app-router-cache-components",
    title: "Cache Components and Partial Prerendering",
    when: "When cacheComponents is on. The session is a dynamic hole inside a prerendered page, and never inside use cache.",
    tags: ["use cache", "Suspense", "useActionState", "Protected route"],
    badge: "Next.js 16",
  },
];

const clientSide: Example[] = [
  {
    href: "/app-router-client-component-route-handler-swr",
    title: "Route Handlers and SWR",
    when: "When a Client Component owns the session UI and reads it over fetch, with optimistic updates.",
    tags: ["Route Handlers", "SWR", "Proxy"],
  },
  {
    href: "/app-router-client-component-redirect-route-handler-fetch",
    title: "Route Handlers and redirects",
    when: "When login should answer with a redirect instead of JSON, and the page re-renders on the server.",
    tags: ["Route Handlers", "redirect"],
  },
];

const otherPatterns: Example[] = [
  {
    href: "/app-router-oauth",
    title: "OAuth login",
    when: "Sign in through a provider. iron-session seals the state on the way out and holds the session on the way back.",
    tags: ["sealData", "state", "Route Handlers"],
  },
  {
    href: "/app-router-magic-links",
    title: "Magic links",
    when: "Passwordless login: seal a token into a URL, unseal it on the way back, then start the session.",
    tags: ["sealData", "unsealData", "useActionState"],
  },
];

const pagesRouter: Example[] = [
  {
    href: "/pages-router-api-route-swr",
    title: "API Routes, getServerSideProps and SWR",
    when: "The Pages Router equivalent of the SWR example above.",
    tags: ["API Routes", "getServerSideProps", "SWR"],
  },
  {
    href: "/pages-router-redirect-api-route-fetch",
    title: "API Routes and redirects",
    when: "The Pages Router equivalent of the redirect example above.",
    tags: ["API Routes", "redirect"],
  },
];

export default function Home() {
  return (
    <main className="p-10 space-y-12">
      <Hero />

      <Section
        title="Start here"
        hint="App Router, the shape the Next.js authentication guide describes."
        examples={appRouter}
      />

      <Section
        title="Reading the session from the client"
        hint="When the session UI lives in a Client Component instead of on the server."
        examples={clientSide}
      />

      <Section title="Other patterns" examples={otherPatterns} />

      <Section
        title="Pages Router"
        hint="Same library, older router. New apps should use the App Router examples above."
        examples={pagesRouter}
      />

      <HowThisMapsToNextjs />
    </main>
  );
}

function Hero() {
  return (
    <div className="space-y-3 max-w-2xl">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
        Cookie-based sessions for Next.js
      </h1>

      <p className="text-lg text-slate-700 dark:text-slate-300">
        The session lives in a signed and encrypted cookie, so there is no session store to run and
        no lookup on the way in. Reading it is a decrypt, which is why these pages render on the
        server with no loading state.
      </p>

      <p className={css.sectionHint}>
        Every example logs in with a fake user. Logging in sleeps 250ms to stand in for a database
        call; reading the session does not, because it never touches one.
      </p>
    </div>
  );
}

function Section({ title, hint, examples }: { title: string; hint?: string; examples: Example[] }) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className={css.sectionTitle}>{title}</h2>
        {hint ? <p className={css.sectionHint}>{hint}</p> : null}
      </div>
      <ExampleGrid examples={examples} />
    </section>
  );
}

function HowThisMapsToNextjs() {
  return (
    <section className="space-y-4 max-w-2xl">
      <h2 className={css.sectionTitle}>How this maps to the Next.js docs</h2>

      <ul className="space-y-3 text-slate-700 dark:text-slate-300">
        <li>
          <strong>Sessions are stateless.</strong> The Next.js guide splits sessions into stateless
          and database-backed. iron-session is the stateless one: the data is sealed into the
          cookie, so there is nothing to look up and nothing to run.
        </li>
        <li>
          <strong>Check the session next to the data it protects.</strong> Read it in the Server
          Component, Server Action or Route Handler that needs it. A layout does not protect the
          pages under it, and neither does a redirect in <code>proxy.ts</code>.
        </li>
        <li>
          <strong>
            <code>proxy.ts</code> is an optimistic check.
          </strong>{" "}
          Middleware was renamed Proxy in Next.js 16. Redirecting from there is a convenience: it is
          one matcher change away from not running, and CVE-2025-29927 was a Next.js bug that let
          requests skip it. iron-session works there through{" "}
          <code>nextProxyCookies(request, response)</code>.
        </li>
        <li>
          <strong>A session read is dynamic.</strong> With <code>cacheComponents</code> on, the part
          of the page that reads it belongs in a <code>&lt;Suspense&gt;</code> boundary, and never
          inside a <code>use cache</code> function.
        </li>
      </ul>

      <p>
        <Link href="/app-router-server-component-and-action" className={css.link}>
          Start with Server Components and Server Actions →
        </Link>
      </p>
    </section>
  );
}
