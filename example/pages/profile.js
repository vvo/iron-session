import React from "react";
import useUser from "../lib/hooks/useUser";
import Layout from "../components/layout";

const Profile = () => {
  const user = useUser({ redirectTo: "/login" });

  return (
    <Layout>
      <h1>Your GitHub profile</h1>

      {user?.isLoggedIn && (
        <>
          <p style={{ fontStyle: "italic" }}>
            Public data, from{" "}
            <a href={githubUrl(user.login)}>{githubUrl(user.login)}</a>, reduced
            to `login` and `avatar_url`.
          </p>
          <pre>{JSON.stringify(user, undefined, 2)}</pre>
        </>
      )}
    </Layout>
  );
};

function githubUrl(login) {
  return `https://api.github.com/${login}`;
}

export default Profile;
