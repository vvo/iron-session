import { GetTheCode } from "@/get-the-code";
import { Title } from "@/app/title";
import * as css from "@/app/css";
import Link from "next/link";
import { Form } from "@/pages-components/pages-router-redirect-api-route-fetch/form";
import Head from "next/head";

export default function PagesRouterRedirect() {
  return (
    <main className="p-10 space-y-5">
      <Head>
        <title>
          🛠 iron-session examples: Pages Router, API routes, redirects and
          fetch
        </title>
      </Head>
      <Title
        category="Pages Router"
        subtitle="+ API routes, redirects, and fetch"
      />

      <p className="italic max-w-xl">
        <u>How to test</u>: Login and refresh the page to see iron-session in
        action.
      </p>

      <div className="grid grid-cols-1 gap-4 p-10 border border-slate-500 rounded-md max-w-xl">
        <Form />
      </div>

      <GetTheCode path="pages/pages-router-redirect-api-route-fetch" />
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

      <ol className="list-decimal list-inside">
        <li>
          The form is submitted to
          /api/pages-router-redirect-api-route-fetch/session (API route) via a
          POST call (non-fetch). The API route sets the session data and
          redirects back to /pages-router-redirect-api-route-fetch (this page).
        </li>
        <li>
          The page gets the session data via a fetch call to
          /api/pages-router-redirect-api-route-fetch/session (API route). The
          API route either return the session data (logged in) or a default
          session (not logged in).
        </li>
        <li>
          The logout is a regular link navigating to
          /api/pages-router-redirect-api-route-fetch/session?action=logout which
          destroy the session and redirects back to
          /pages-router-redirect-api-route-fetch (this page).
        </li>
      </ol>

      <p>
        <strong>Pros</strong>: Straightforward. It does not rely on too many
        APIs. This is what we would have implemented a few years ago and is good
        enough for many websites.
      </p>
      <p>
        <strong>Cons</strong>: No synchronization. The session is not updated
        between tabs and windows. If you login or logout in one window or tab,
        the others are still showing the previous state. Also, we rely on full
        page navigation and redirects for login and logout. We could remove them
        by using fetch instead.
      </p>
    </details>
  );
}
