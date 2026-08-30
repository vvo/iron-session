import { Suspense } from "react";
import type { Metadata } from "next";

import * as css from "@/app/css";
import { Title } from "../../title";

export const metadata: Metadata = {
  title: "🛠 iron-session examples: Example Provider",
};

/**
 * A stand-in for GitHub, Google or whoever you actually use.
 *
 * Real providers need registered credentials, which a public demo cannot hold,
 * so this fakes the consent screen and the redirect back. Everything on the
 * iron-session side of the flow, the sealed state cookie and the session, is
 * the real thing.
 */
export default function Provider({
  searchParams,
}: {
  searchParams: Promise<{ redirect_uri?: string; state?: string; client_id?: string }>;
}) {
  return (
    <main className="p-10 space-y-5">
      <Title subtitle="Example Provider" category="Not a real provider, part of the demo" />

      <Suspense
        fallback={
          <div className="h-44 max-w-xl animate-pulse rounded-md bg-slate-200 dark:bg-slate-800" />
        }
      >
        <Consent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Consent({
  searchParams,
}: {
  searchParams: Promise<{ redirect_uri?: string; state?: string; client_id?: string }>;
}) {
  const { redirect_uri: redirectUri, state, client_id: clientId } = await searchParams;

  if (!redirectUri || !state) {
    return <p>This authorize URL is missing its redirect_uri or state.</p>;
  }

  const callback = new URL(redirectUri);
  callback.searchParams.set("code", "code-oauth-user");
  callback.searchParams.set("state", state);

  return (
    <div className="max-w-xl space-y-4 rounded-md border border-slate-300 dark:border-slate-700 p-6">
      <p className="text-lg">
        <strong>{clientId ?? "An application"}</strong> wants to sign you in as{" "}
        <strong>oauth-user</strong>.
      </p>

      <p className={css.sectionHint}>
        Approving sends you back to the callback with a code and the same state value the app
        generated.
      </p>

      <a href={callback.toString()} className={`${css.button} inline-block`}>
        Authorize
      </a>
    </div>
  );
}
