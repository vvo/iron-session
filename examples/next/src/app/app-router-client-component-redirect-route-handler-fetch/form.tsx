"use client";

import * as css from "@/app/css";

import { useEffect, useState } from "react";
import { SessionData } from "./lib";
import { defaultSession } from "./lib";

export function Form() {
  const [session, setSession] = useState<SessionData>(defaultSession);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/app-router-client-component-redirect-route-handler-fetch/session")
      .then((res) => res.json())
      .then((session) => {
        setSession(session);
        setIsLoading(false);
      });
  }, []);

  if (isLoading) {
    return <p className="text-lg">Loading...</p>;
  }

  if (session.isLoggedIn) {
    return (
      <>
        <p className="text-lg">
          Logged in user: <strong>{session.username}</strong>
        </p>
        <LogoutButton />
      </>
    );
  }

  return <LoginForm />;
}

function LoginForm() {
  return (
    <form
      action="/app-router-client-component-redirect-route-handler-fetch/session"
      method="POST"
      className={css.form}
    >
      <label className="block text-lg">
        <span className={css.label}>Username</span>
        <input
          type="text"
          name="username"
          className={css.input}
          placeholder=""
          defaultValue="Alison"
          required
          // for demo purposes, disabling autocomplete 1password here
          autoComplete="off"
          data-1p-ignore
        />
      </label>
      <div>
        <input type="submit" value="Login" className={css.button} />
      </div>
    </form>
  );
}

function LogoutButton() {
  return (
    <p>
      <a
        href="/app-router-client-component-redirect-route-handler-fetch/session?action=logout"
        className={css.button}
      >
        Logout
      </a>
    </p>
  );
}
