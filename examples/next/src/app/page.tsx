import Link from "next/link";
import * as css from "@/app/css";

export default function Home() {
  return (
    <main className="p-10 space-y-5">
      <h1 className="text-2xl">
        🔐{" "}
        <Link className={css.link} href="/">
          iron-session
        </Link>{" "}
        examples
      </h1>
      <p>Intro</p>
      <ul className="list-disc list-inside text-lg">
        <li>
          <Link
            className={css.link}
            href="/app-router-server-component-and-action"
            // prefetch = false to avoid caching issues when navigating between tabs/windows
            prefetch={false}
          >
            App router + server components, and server actions
          </Link>
        </li>
        <li>
          <Link
            className={css.link}
            href="/app-router-client-component-redirect-route-handler-fetch"
          >
            App router + client components, route handlers, redirects, and fetch
          </Link>
        </li>
        <li>
          <Link
            className={css.link}
            href="/app-router-client-component-route-handler-swr"
          >
            App router + client components, route handlers, and swr
          </Link>
        </li>
      </ul>
    </main>
  );
}
