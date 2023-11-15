// import { getIronSession } from "iron-session";
// import { ironSessionOptions } from "./config";
"use client";

import { useEffect, useState } from "react";
import { SessionData } from "../types";
import { defaultSession } from "./config";
import * as css from "@/app/css";
import Link from "next/link";

export default function AppRouter() {
  const [session, setSession] = useState<SessionData>(defaultSession);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/app-router/session")
      .then((res) => res.json())
      .then((session) => {
        setSession(session);
        setIsLoading(false);
      });
  }, []);

  const showForm = !isLoading && !session.isLoggedIn;

  return (
    <main className="p-10 space-y-5">
      <h1 className="text-2xl">
        🔐 iron-session examples: App router{" "}
        <span className="text-gray-500">
          (client component | route handler | redirect | fetch)
        </span>
      </h1>

      {isLoading && <p className="text-lg">Loading...</p>}
      {session.isLoggedIn && (
        <p className="text-lg">
          Logged in user: <strong>{session.username}</strong>
        </p>
      )}
      {session.isLoggedIn && <LogoutButton />}
      {showForm && <LoginForm />}
      <HowItWorks />
      <p>
        <Link href="/" className="text-indigo-500 text-lg">
          ← All examples
        </Link>
      </p>
    </main>
  );
}

function LoginForm() {
  return (
    <form action="/app-router/login" method="POST" className={css.form}>
      <label className="block text-lg">
        <span className="text-gray-700">Username</span>
        <input
          type="text"
          name="username"
          className={css.input}
          placeholder=""
          defaultValue="Eva"
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
      <a href="/app-router/logout" className={css.button}>
        Logout
      </a>
    </p>
  );
}

function HowItWorks() {
  return (
    <details className="max-w-2xl space-y-4">
      <summary className="cursor-pointer text-gray-700">How it works</summary>

      <ol className="list-decimal list-inside">
        <li>
          The form is submitted to /app-router/login (route handler) via a POST
          call (non-fetch). The route handler sets the session data and
          redirects back to /app-router (this page).
        </li>
        <li>
          The page gets the session data via a fetch call to /app-router/session
          (route handler). The route handler either return the session data
          (logged in) or a default session (not logged in).
        </li>
        <li>
          The logout is a regular link navigating to /app-router/logout which
          destroy the session and redirects back to /app-router (this page).
        </li>
      </ol>

      <p>
        <strong>Pros</strong>: Straightforward. It does not rely on too many
        APIs. This is what we would have implemented a few years ago and is good
        enough for many websites.
      </p>
      <p>
        <strong>Cons</strong>: No synchronization. The session is not updated
        between tabs and windows. If you login or logout in one window or tab,
        the others are still showing the previous state. Also, we rely on full
        page navigation and redirects for login and logout. We could remove them
        by using fetch instead.
      </p>
    </details>
  );
}
