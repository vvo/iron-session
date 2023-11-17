import Link from "next/link";
import * as css from "@/app/css";

import { Metadata } from "next";
import { Form } from "./form";
import { Title } from "@/app/title";

export const metadata: Metadata = {
  title:
    "🔐 iron-session examples: App router using client components, redirects, route handlers and fetch",
};

export default function AppRouterRedirect() {
  return (
    <main className="p-10 space-y-5">
      <Title
        subtitle={
          <>
            + client components, route handlers, and{" "}
            <a
              className={css.link}
              href="https://swr.vercel.app"
              target="_blank"
            >
              swr
            </a>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 p-10 border border-gray-500 rounded-md max-w-xl">
        <Form />
        <div className="text-md text-gray-700 space-y-2">
          <hr />
          <p>
            The following pages are protected and will redirect back here if
            you&quot;re not logged in:
          </p>
          {/* convert the following paragraphs into a ul li */}
          <ul className="list-disc list-inside">
            <li>
              <Link
                href="/app-router-client-component-route-handler-swr/protected-client"
                className={css.link}
              >
                Protected page via client component →
              </Link>
            </li>
            <li>
              <Link
                href="/app-router-client-component-route-handler-swr/protected-server"
                className={css.link}
                // required to avoid caching issues when navigating between tabs/windows
                prefetch={false}
              >
                Protected page via server component →
              </Link>{" "}
              <small>(broken: cache issue)</small>
            </li>
            <li>
              <Link
                href="/app-router-client-component-route-handler-swr/protected-middleware"
                className={css.link}
              >
                Protected page via middleware →
              </Link>{" "}
              <small>(broken: cache issue)</small>
            </li>
          </ul>
        </div>
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
        <li></li>
        <li></li>
        <li></li>
      </ol>

      <p>
        <strong>Pros</strong>:
      </p>
      <p>
        <strong>Cons</strong>:
      </p>
    </details>
  );
}
