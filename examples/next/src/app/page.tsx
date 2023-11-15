import Image from "next/image";
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
          >
            App Router
          </Link>
        </li>
      </ul>
    </main>
  );
}
