import { Suspense } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import type { Metadata } from "next";

import * as css from "@/app/css";
import { GetTheCode } from "../../get-the-code";
import { Title } from "../title";
import { SessionSkeleton } from "../session-skeleton";
import { MagicLinkForm } from "./magic-link-form";
import { logout } from "./actions";
import { sessionOptions, type SessionData } from "./lib";

export const metadata: Metadata = {
  title: "🛠 iron-session examples: Magic links",
};

export default function MagicLinks() {
  return (
    <main className="p-10 space-y-5">
      <Title subtitle="Magic links" category="App Router" />

      <p className="max-w-xl text-slate-700 dark:text-slate-300">
        Log in without a password. The username is sealed into a URL, and opening that URL unseals
        it and starts a session.
      </p>

      <div className="max-w-xl rounded-md border border-slate-300 dark:border-slate-700 p-6">
        <Suspense fallback={<SessionSkeleton />}>
          <SessionPanel />
        </Suspense>
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

async function SessionPanel() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

  if (!session.isLoggedIn) {
    return <MagicLinkForm />;
  }

  return (
    <div className="space-y-4">
      <p className="text-lg">
        Logged in user: <strong>{session.username}</strong>
      </p>
      <form action={logout}>
        <input type="submit" value="Logout" className={css.button} />
      </form>
    </div>
  );
}

function HowItWorks() {
  return (
    <details className="max-w-2xl space-y-4">
      <summary className="cursor-pointer">How it works</summary>

      <ol className="list-decimal list-inside space-y-2">
        <li>
          A Server Action seals the username with <code>sealData</code> and returns the link. The
          page renders it through <code>useActionState</code>, so nothing navigates away.
        </li>
        <li>
          Opening the link hits a Route Handler that calls <code>unsealData</code> and saves the
          session. A tampered or expired seal unseals to an empty object, so it redirects back
          without logging anyone in.
        </li>
        <li>
          The token is sealed with its own password, never the session one. Both shared a password
          once, which meant a link token was a valid session cookie and the other way around. A
          leaked link in an email or a referrer header was a full session.
        </li>
        <li>
          The token has a 15 minute <code>ttl</code>. Without an invalidation list a link still
          works more than once inside that window, so treat it as a short-lived bearer token.
        </li>
      </ol>
    </details>
  );
}
