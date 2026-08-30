import { Title } from "@/app/title";
import { Suspense } from "react";
import * as css from "@/app/css";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "../lib";
import Link from "next/link";

// No route segment config here on purpose. `cacheComponents` is on, so the
// shell below prerenders and the session read inside <Suspense> runs per
// request. That is what `force-dynamic` and `revalidate = 0` were reaching for.
async function getSession() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

  return session;
}

export default function ProtectedServer() {
  return (
    <main className="p-10 space-y-5">
      <Title subtitle="Protected page" />
      <Suspense fallback={<p className="text-lg">Loading...</p>}>
        <Content />
      </Suspense>
      <p>
        <Link href="/app-router-client-component-route-handler-swr" className={css.link}>
          ← Back
        </Link>
      </p>
    </main>
  );
}

async function Content() {
  const session = await getSession();

  if (!session.isLoggedIn) {
    redirect("/app-router-client-component-route-handler-swr");
  }

  return (
    <div className="max-w-xl space-y-2">
      <p>
        Hello <strong>{session.username}!</strong>
      </p>
      <p>
        This page is protected and can only be accessed if you are logged in. Otherwise you will be
        redirected to the login page.
      </p>
      <p>The check is done via a server component.</p>
    </div>
  );
}
