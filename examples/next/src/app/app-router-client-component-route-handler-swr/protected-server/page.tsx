import { Title } from "@/app/title";
import { Suspense } from "react";
import * as css from "@/app/css";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServerActionIronSession } from "iron-session";
import { SessionData, defaultSession, sessionOptions } from "../lib";
import Link from "next/link";

// Broken: None of these parameters is working, thus we have caching issues
// TODO fix this
export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getSession() {
  const session = await getServerActionIronSession<SessionData>(
    sessionOptions,
    cookies(),
  );

  return session;
}

export default function ProtectedServer() {
  return (
    <main className="p-10 space-y-5 max-w-xl">
      <Title subtitle="Protected page" />
      <Suspense fallback={<p className="text-lg">Loading...</p>}>
        <Content />
      </Suspense>
      <p>
        <Link
          href="/app-router-client-component-route-handler-swr"
          className={css.link}
        >
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
    <>
      <p>
        Hello <strong>{session.username}!</strong>
      </p>
      <p>
        This page is protected and can only be accessed if you are logged in.
        Otherwise you will be redirected to the login page.
      </p>
      <p>The check is done via a server component.</p>
      <p>
        One benefit of using{" "}
        <a href="https://swr.vercel.app" target="_blank" className={css.link}>
          swr
        </a>
        : if you open the page in different tabs/windows, and logout from one
        place, every other tab/window will be synced and logged out.
      </p>
    </>
  );
}
