import { Title } from "@/app/title";
import useSession from "@/pages-components/pages-router-api-route-swr/use-session";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import * as css from "@/app/css";
import Link from "next/link";

export default function ProtectedClient() {
  return (
    <main className="p-10 space-y-5">
      <Title subtitle="Protected page" />
      <Content />
      <p>
        <Link href="/pages-router-api-route-swr" className={css.link}>
          ← Back
        </Link>
      </p>
    </main>
  );
}

function Content() {
  const { session, isLoading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !session.isLoggedIn) {
      router.replace("/pages-router-api-route-swr");
    }
  }, [isLoading, session.isLoggedIn, router]);

  if (isLoading) {
    return <p className="text-lg">Loading...</p>;
  }

  return (
    <div className="max-w-xl space-y-2">
      <p>
        Hello <strong>{session.username}!</strong>
      </p>
      <p>
        This page is protected and can only be accessed if you are logged in.
        Otherwise you will be redirected to the login page.
      </p>
      <p>The check is done via a fetch call on the client using SWR.</p>
      <p>
        One benefit of using{" "}
        <a href="https://swr.vercel.app" target="_blank" className={css.link}>
          SWR
        </a>
        : if you open the page in different tabs/windows, and logout from one
        place, every other tab/window will be synced and logged out.
      </p>
    </div>
  );
}
