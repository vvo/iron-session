import Link from "next/link";
import type { ReactNode } from "react";

import * as css from "@/app/css";

export interface Example {
  href: string;
  title: string;
  /** One line: when you would reach for this, not what it contains. */
  when: ReactNode;
  /** Next.js vocabulary, so the mapping to their docs is obvious. */
  tags: string[];
  badge?: string;
}

export function ExampleCard({ href, title, when, tags, badge }: Example) {
  return (
    <li className={css.card}>
      <div className="flex items-start justify-between gap-3">
        <Link href={href} className={css.cardLink}>
          {title}
        </Link>
        {badge ? (
          <span className="shrink-0 rounded-full bg-indigo-100 dark:bg-indigo-950 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300">
            {badge}
          </span>
        ) : null}
      </div>

      <p className="text-sm text-slate-600 dark:text-slate-400">{when}</p>

      <ul className="flex flex-wrap gap-1.5">
        {tags.map((label) => (
          <li key={label} className={css.tag}>
            {label}
          </li>
        ))}
      </ul>
    </li>
  );
}

export function ExampleGrid({ examples }: { examples: Example[] }) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 max-w-4xl">
      {examples.map((example) => (
        <ExampleCard key={example.href} {...example} />
      ))}
    </ul>
  );
}
