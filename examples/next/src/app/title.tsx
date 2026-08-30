import type { ReactNode } from "react";

import * as css from "@/app/css";

/**
 * The heading of an example page.
 *
 * The site chrome (name, GitHub, npm) moved to `SiteHeader` in the layout, so
 * every page has the same header at the same height and navigating between
 * examples moves nothing.
 */
export function Title({ category, subtitle }: { category?: string; subtitle: ReactNode }) {
  return (
    <div className="space-y-1">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{subtitle}</h1>
      {category ? <p className={css.sectionHint}>{category}</p> : null}
    </div>
  );
}
