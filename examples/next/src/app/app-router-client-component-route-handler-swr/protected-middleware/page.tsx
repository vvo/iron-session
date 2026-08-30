import { Title } from "@/app/title";
import { Suspense } from "react";
import * as css from "@/app/css";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "../lib";
import Link from "next/link";

// The session lives in a cookie, so the part of this page that reads it can
// never be static. With `cacheComponents` on, that is expressed by the
// <Suspense> boundary below rather than by `export const dynamic`.
async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
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

  // proxy.ts already redirects anonymous visitors, and this check is here
  // anyway. Middleware is a convenience: it is one matcher change away from not
  // running, and CVE-2025-29927 was a Next.js bug that let requests skip it.
  // The real check belongs next to the data it protects.
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
      <p>
        The redirect is done in <code>proxy.ts</code>, and this page checks the session again
        itself. Middleware is for the redirect, not for the security boundary.
      </p>
    </div>
  );
}
