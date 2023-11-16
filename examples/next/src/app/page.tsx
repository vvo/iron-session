import Link from "next/link";

export default function Home() {
  return (
    <main className="p-10 space-y-5">
      <h1 className="text-2xl">🔐 iron-session examples</h1>
      <ul className="list-disc list-inside text-lg">
        <li>
          <Link
            className="text-indigo-500 underline hover:no-underline"
            href="/app-router"
            prefetch={false}
          >
            App Router
          </Link>{" "}
          <span className="text-gray-500">(server action)</span>
        </li>
        <li>
          <Link
            className="text-indigo-500 underline hover:no-underline"
            href="/app-router-redirect"
          >
            App Router
          </Link>{" "}
          <span className="text-gray-500">
            (client component | route handler | redirect | fetch)
          </span>
        </li>
      </ul>
    </main>
  );
}
