import Link from "next/link";
import * as css from "@/app/css";
import { Title } from "./title";

export default function Home() {
  return (
    <main className="p-10 space-y-5">
      <Title subtitle="" category="Home" />
      <p className="max-w-xl">
        This website showcase different ways to use the iron-session library.
        <br />
        Note: We&apos;ve added delay to simulate database requests at login.
      </p>
      <h2 className="text-slate-700 dark:text-slate-300 text-xl">
        Main Examples:
      </h2>
      <ul className="list-disc list-inside">
        <li>
          <Link
            // rewrite className with template literal
            className={`${css.link} text-lg`}
            href="/app-router-client-component-route-handler-swr"
          >
            App router + client components, route handlers, and SWR
          </Link>{" "}
          🤩
        </li>
        <li>
          <Link
            href="/pages-router-api-route-swr"
            className={`${css.link} text-lg`}
          >
            Pages Router + API routes, getServerSideProps, and SWR
          </Link>{" "}
          🤩
        </li>
      </ul>
      <p className="indent-10 text-center text-md text-slate-700 dark:text-slate-400 max-w-lg">
        ☝️ These two examples are the most advanced and the ones we recommend
        for now.
      </p>
      <h2 className="text-slate-700 dark:text-slate-300 text-xl">
        Other Examples:
      </h2>
      <ul className="list-disc list-inside">
        <li>
          <Link
            className={`${css.link} text-lg`}
            href="/app-router-server-component-and-action"
            // prefetch = false to avoid caching issues when navigating between tabs/windows
            prefetch={false}
          >
            App router + server components, and server actions
          </Link>
        </li>
        <li>
          <Link
            className={`${css.link} text-lg`}
            href="/app-router-client-component-redirect-route-handler-fetch"
          >
            App router + client components, route handlers, redirects, and fetch
          </Link>
        </li>
        <li>
          <Link
            href="/pages-router-redirect-api-route-fetch"
            className={`${css.link} text-lg`}
          >
            Pages Router + API routes, redirects, and fetch
          </Link>
        </li>
        <li>
          <Link
            href="/app-router-magic-links"
            className={`${css.link} text-lg`}
          >
            Magic links
          </Link>
        </li>
        <li className="text-slate-500">
          OAuth login example (SWR) (Help needed)
        </li>
        <li className="text-slate-500">
          Pages Router (and App Router?) req.session wrappers (Help needed)
        </li>
      </ul>
    </main>
  );
}
