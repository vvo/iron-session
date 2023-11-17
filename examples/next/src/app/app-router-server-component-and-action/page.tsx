import Link from "next/link";

import { Metadata } from "next";
import { Form } from "./form";
import { Suspense } from "react";
import * as css from "@/app/css";

export const metadata: Metadata = {
  title: "🔐 iron-session examples: App router and server actions",
};

export default async function AppRouter() {
  return (
    <main className="p-10 space-y-5">
      <div>
        <h1 className="text-2xl">
          🔐{" "}
          <Link className={css.link} href="/">
            iron-session
          </Link>{" "}
          examples: App router{" "}
        </h1>
        <h2 className="text-xl text-gray-500">
          + server components, and server actions
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4 p-10 border border-gray-500 rounded-md max-w-xl">
        <Suspense fallback={<p className="text-lg">Loading...</p>}>
          <Form />
        </Suspense>
      </div>

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
      <summary className="cursor-pointer text-gray-700">How it works</summary>

      <ol className="list-decimal list-inside">
        <li>During login, the page uses a server action.</li>
        <li>During logout, the page uses a server action.</li>
        <li>
          When displaying session data, the server component gets the data and
          pass it to the page.
        </li>
      </ol>
    </details>
  );
}
