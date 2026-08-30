/**
 * Placeholder for a session panel that is still streaming.
 *
 * It mirrors the login form's boxes at the same heights, so the page does not
 * jump when the real thing replaces it.
 *
 * In practice you should rarely see this. Reading an iron-session is a cookie
 * unseal with no network call, so the dynamic hole resolves in about a
 * millisecond and Next flushes it with the shell. It exists for the slow cases,
 * not for the common one.
 */
export function SessionSkeleton() {
  return (
    <div className="grid max-w-md grid-cols-1 gap-6 animate-pulse" aria-hidden="true">
      <div className="space-y-1">
        <div className="h-6 w-24 rounded-sm bg-slate-200 dark:bg-slate-700" />
        <div className="h-9 w-full rounded-sm bg-slate-200 dark:bg-slate-700" />
      </div>
      <div className="h-10 w-24 rounded-sm bg-slate-200 dark:bg-slate-700" />
    </div>
  );
}
