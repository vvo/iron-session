import { Suspense } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import type { Metadata } from "next";

import * as css from "@/app/css";
import { GetTheCode } from "../../get-the-code";
import { Title } from "../title";
import { SessionSkeleton } from "../session-skeleton";
import { logout, startLogin } from "./actions";
import { sessionOptions, type SessionData } from "./lib";

export const metadata: Metadata = {
  title: "🛠 iron-session examples: OAuth login",
};

export default function OAuth({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return (
    <main className="p-10 space-y-5">
      <Title subtitle="OAuth login" category="App Router" />

      <p className="max-w-xl text-slate-700 dark:text-slate-300">
        iron-session holds two things in an OAuth flow: the short-lived <code>state</code> on the
        way out, and the session on the way back.
      </p>

      {/* searchParams is a runtime API, so it gets its own boundary. */}
      <Suspense fallback={null}>
        <StateError searchParams={searchParams} />
      </Suspense>

      <div className="max-w-xl rounded-md border border-slate-300 dark:border-slate-700 p-6">
        <Suspense fallback={<SessionSkeleton />}>
          <SessionPanel />
        </Suspense>
      </div>

      <GetTheCode path="app/app-router-oauth" />
      <HowItWorks />

      <p>
        <Link href="/" className={css.link}>
          ← All examples
        </Link>
      </p>
    </main>
  );
}

async function StateError({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  if (error !== "state") {
    return null;
  }

  return (
    <p className="max-w-xl text-red-600 dark:text-red-400">
      The state did not match, so the callback was rejected and no session was created.
    </p>
  );
}

async function SessionPanel() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

  if (!session.isLoggedIn) {
    return (
      <form action={startLogin} className="space-y-4">
        <p className={css.sectionHint}>
          Sends you to a fake provider, which sends you back to the callback.
        </p>
        <input type="submit" value="Sign in with Example Provider" className={css.button} />
      </form>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-lg">
        Logged in user: <strong>{session.username}</strong>
      </p>
      <p className={css.sectionHint}>Signed in through {session.provider}.</p>
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
          A Server Action mints a random <code>state</code>, saves it in its own sealed cookie, and
          redirects to the provider with the same value in the URL.
        </li>
        <li>
          The provider sends the visitor back to <code>/callback</code> with a code and that state.
          The route compares the two before trusting the code, and destroys the state cookie either
          way, so a link cannot be replayed.
        </li>
        <li>
          Only then does it create the session. Skipping the state check is a login CSRF: someone
          hands you a callback URL carrying their code and your browser ends up in their account.
        </li>
        <li>
          The state cookie uses a different password from the session, so neither can be presented
          as the other.
        </li>
        <li>
          The provider here is part of the demo. A real one needs registered credentials, which a
          public example cannot hold, but the iron-session half of the flow is unchanged.
        </li>
      </ol>
    </details>
  );
}
