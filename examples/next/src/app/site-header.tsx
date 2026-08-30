import Link from "next/link";

import * as css from "@/app/css";
import GitHubLogo from "./GitHubLogo";

/**
 * The same header on every page, home included.
 *
 * It is identical markup everywhere so navigating between examples never moves
 * anything, and it contains no session read, so it lives in the prerendered
 * shell and paints immediately.
 */
export function SiteHeader() {
  return (
    <header className="flex h-12 items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800">
      <Link href="/" className="text-lg font-semibold text-slate-900 dark:text-white">
        <span className="hidden dark:inline">🌝</span>
        <span className="dark:hidden">🛠</span> iron-session
        <span className="font-normal text-slate-500 dark:text-slate-400"> examples</span>
      </Link>

      <nav className="flex items-center gap-4 text-sm">
        <a href="https://www.npmjs.com/package/iron-session" target="_blank" className={css.link}>
          npm
        </a>
        <a
          href="https://nextjs.org/docs/app/guides/authentication"
          target="_blank"
          className={css.link}
        >
          Next.js auth guide
        </a>
        <a
          href="https://github.com/vvo/iron-session"
          target="_blank"
          className="flex items-center gap-2 text-slate-700 dark:text-slate-300 underline hover:no-underline"
        >
          <GitHubLogo />
          GitHub
        </a>
      </nav>
    </header>
  );
}

/**
 * The line under the header on an example page: what this example is, and the
 * way back. Fixed height for the same reason as the header.
 */
export function ExampleHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="space-y-1">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h1>
      {subtitle ? <p className={css.sectionHint}>{subtitle}</p> : null}
    </div>
  );
}
