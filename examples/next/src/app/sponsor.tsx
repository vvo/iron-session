const turnshiftUrl =
  "https://turnshift.app/?utm_source=github&utm_medium=sponsor&utm_campaign=iron-session-site";

export function SponsorBanner() {
  return (
    <a
      href={turnshiftUrl}
      target="_blank"
      className="block max-w-[880px] rounded-[14px] transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-indigo-500"
    >
      <span className="block sm:hidden rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 text-sm text-slate-600 dark:text-slate-400">
        <span className="block text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
          Sponsored by
        </span>
        <span className="mt-1 block">
          <strong className="font-semibold text-slate-900 dark:text-white">
            TurnShift, the team calendar in Slack.
          </strong>{" "}
          People book their shifts or take turns, Slack tells everyone who is on.
        </span>
        <span className="mt-2 block font-semibold text-indigo-500 dark:text-indigo-400">
          Try it free for 14 days →
        </span>
      </span>
      <picture className="hidden sm:block">
        <source media="(prefers-color-scheme: dark)" srcSet="/sponsor/turnshift-dark.png" />
        <img
          src="/sponsor/turnshift-light.png"
          width={880}
          height={136}
          alt="Sponsored by TurnShift, the team calendar in Slack. Try it free for 14 days."
          className="block h-auto w-full"
        />
      </picture>
    </a>
  );
}

export function SponsorLink() {
  return (
    <a
      href={turnshiftUrl}
      target="_blank"
      className="hidden sm:inline text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
    >
      Sponsored by{" "}
      <span className="font-medium text-indigo-500 dark:text-indigo-400">TurnShift</span>
    </a>
  );
}
