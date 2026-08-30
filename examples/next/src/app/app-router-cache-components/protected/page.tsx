import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";

import * as css from "@/app/css";
import { Title } from "../../title";
import { SessionSkeleton } from "../../session-skeleton";
import { verifySession } from "../dal";
import { basePath } from "../lib";

export const metadata: Metadata = {
  title: "🛠 iron-session examples: Protected page",
};

export default function Protected() {
  return (
    <main className="p-10 space-y-5">
      <Title subtitle="Protected page" category="Checked in the Data Access Layer" />

      {/* The check reads a cookie, so it is dynamic and belongs in a boundary
          like any other session read. The shell around it still prerenders. */}
      <Suspense fallback={<SessionSkeleton />}>
        <Content />
      </Suspense>

      <p>
        <Link href={basePath} className={css.link}>
          ← Back
        </Link>
      </p>
    </main>
  );
}

async function Content() {
  // Redirects a signed-out visitor before anything below renders.
  const { username } = await verifySession();

  return (
    <div className="max-w-xl space-y-2">
      <p>
        Hello <strong>{username}!</strong>
      </p>
      <p>
        The check runs in <code>verifySession()</code>, next to the data it protects, not in a
        layout and not in <code>proxy.ts</code>. A layout does not re-render on every navigation, so
        a check there can be skipped.
      </p>
    </div>
  );
}
