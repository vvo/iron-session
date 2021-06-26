import React from "react";
import useUser from "../lib/useUser";
import useEvents from "../lib/useEvents";
import Layout from "../components/Layout";

const SgProfile = () => {
  const { user } = useUser({ redirectTo: "/login" });
  const { events, loadingEvents } = useEvents(user);

  if (!user?.isLoggedIn || loadingEvents) {
    return <Layout>loading...</Layout>;
  }

  return (
    <Layout>
      <h1>Your GitHub profile</h1>
      <h2>
        This page uses{" "}
        <a href="https://nextjs.org/docs/basic-features/pages#static-generation-recommended">
          Static Generation (SG)
        </a>{" "}
        and the <a href="/api/user">/api/user</a> route (using{" "}
        <a href="https://github.com/vercel/swr">vercel/SWR</a>)
      </h2>

      <p style={{ fontStyle: "italic" }}>
        Public data, from{" "}
        <a href={githubUrl(user.login)}>{githubUrl(user.login)}</a>, reduced to
        `login` and `avatar_url`.
      </p>
      <pre>{JSON.stringify(user, undefined, 2)}</pre>

      <p>
        Number of GitHub events for user: <b>{events.length}</b>, last event
        type: <b>{events[0].type}</b>
      </p>
    </Layout>
  );
};

function githubUrl(login) {
  return `https://api.github.com/users/${login}`;
}

export default SgProfile;
