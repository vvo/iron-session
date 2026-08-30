import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";

import * as css from "@/app/css";
import { Title } from "../../title";
import { SessionSkeleton } from "../../session-skeleton";
import { basePath, verifySession } from "../dal";

export const metadata: Metadata = {
  title: "🛠 iron-session examples: Protected page",
};

export default function Protected() {
  return (
    <main className="p-10 space-y-5">
      <Title subtitle="Protected page" category="Checked in the Data Access Layer" />

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
  const { username } = await verifySession();

  return (
    <div className="max-w-xl space-y-2">
      <p>
        Hello <strong>{username}!</strong>
      </p>
      <p>
        <code>verifySession()</code> redirects before this renders. It lives in <code>dal.ts</code>{" "}
        next to the session read, so every page, action and route handler that needs the check calls
        the same function.
      </p>
    </div>
  );
}
