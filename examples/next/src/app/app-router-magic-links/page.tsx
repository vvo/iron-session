import * as css from "@/app/css";
import Link from "next/link";

import { Metadata } from "next";
import { GetTheCode } from "../../get-the-code";
import { Title } from "../title";
import { Form } from "./form";

export const metadata: Metadata = {
  title: "🛠 iron-session examples: Magic links",
};

export default function AppRouterRedirect() {
  return (
    <main className="p-10 space-y-5">
      <Title subtitle="+ client components, route handlers, redirects, and fetch" />

      <p className="italic max-w-xl">
        <u>How to test</u>: Login and refresh the page to see iron-session in
        action.
      </p>

      <div className="grid grid-cols-1 gap-4 p-10 border border-slate-500 rounded-md max-w-xl">
        <Form />
      </div>

      <GetTheCode path="app/app-router-magic-links" />
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
          The form is submitted to /app-router-magic-links/session (API route)
          via a POST call (non-fetch). The API route generates a sealed token
          and returns the magic link to client so it can be either sent or used
          right away. When the magic link is visited it sets the session data
          and redirects back to /app-router-magic-links (this page)
        </li>
        <li>
          The page gets the session data via a fetch call to
          /app-router-magic-links/session (API route). The API route either
          return the session data (logged in) or a default session (not logged
          in).
        </li>
        <li>
          The logout is a regular link navigating to
          /app-router-magic-links/logout which destroy the session and redirects
          back to /app-router-magic-links (this page).
        </li>
      </ol>

      <p>
        <strong>Pros</strong>: Simple.
      </p>
      <p>
        <strong>Cons</strong>: Dangerous if not used properly. Without any
        invalidations or blacklists, the magic link can be used multiple times
        if compromised.
      </p>
    </details>
  );
}
