import { Title } from "@/app/title";
import * as css from "@/app/css";

import { getIronSession } from "iron-session";
import {
  SessionData,
  sessionOptions,
} from "@/pages-components/pages-router-api-route-swr/lib";
import Link from "next/link";
import type { InferGetServerSidePropsType, GetServerSideProps } from "next";

export default function ProtectedServer({
  session,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <main className="p-10 space-y-5">
      <Title subtitle="Protected page" />
      <Content session={session} />
      <p>
        <Link href="/pages-router-api-route-swr" className={css.link}>
          ← Back
        </Link>
      </p>
    </main>
  );
}

export const getServerSideProps = (async (context) => {
  const session = await getIronSession<SessionData>(
    context.req,
    context.res,
    sessionOptions,
  );

  if (!session.isLoggedIn) {
    return {
      redirect: {
        destination: "/pages-router-api-route-swr",
        permanent: false,
      },
    };
  }

  return { props: { session } };
}) satisfies GetServerSideProps<{
  session: SessionData;
}>;

function Content({ session }: { session: SessionData }) {
  return (
    <div className="max-w-xl space-y-2">
      <p>
        Hello <strong>{session.username}!</strong>
      </p>
      <p>
        This page is protected and can only be accessed if you are logged in.
        Otherwise you will be redirected to the login page.
      </p>
      <p>
        The isLoggedIn check is done by a middleware and the data comes from
        getServerSideProps.
      </p>
    </div>
  );
}
