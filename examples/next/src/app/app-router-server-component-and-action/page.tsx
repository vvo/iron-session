import Link from "next/link";

import { Metadata } from "next";
import { Form } from "./form";
import { Suspense } from "react";
import * as css from "@/app/css";
import { Title } from "../title";
import { GetTheCode } from "../../get-the-code";

export const metadata: Metadata = {
  title: "🛠 iron-session examples: Server components, and server actions",
};

export default async function AppRouter() {
  return (
    <main className="p-10 space-y-5">
      <Title subtitle="+ server components, and server actions" />

      <p className="italic max-w-xl">
        <u>How to test</u>: Login and refresh the page to see iron-session in
        action.
      </p>

      <div className="grid grid-cols-1 gap-4 p-10 border border-slate-500 rounded-md max-w-xl">
        <Suspense fallback={<p className="text-lg">Loading...</p>}>
          <Form />
        </Suspense>
      </div>

      <GetTheCode path="app/app-router-server-component-and-action" />
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
