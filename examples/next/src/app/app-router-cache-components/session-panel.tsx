import * as css from "@/app/css";

import { getSession, logout } from "./actions";
import { LoginForm } from "./login-form";

/**
 * The dynamic hole. Reading the session reads a cookie, so this component
 * cannot be prerendered and has to be wrapped in <Suspense> by its parent.
 */
export async function SessionPanel() {
  const session = await getSession();

  return (
    <div className="grid grid-cols-1 gap-4 p-6 border border-slate-500 rounded-md max-w-xl">
      <p className="text-lg">Per request, private to you</p>

      {session.isLoggedIn ? (
        <>
          <p>
            Logged in user: <strong data-testid="username">{session.username}</strong>
          </p>
          <p>
            Last seen <code data-testid="last-seen">{session.lastSeen ?? "never"}</code>, written by{" "}
            <code>proxy.ts</code> on this request
          </p>
          <form action={logout}>
            <input type="submit" value="Logout" className={css.button} data-testid="logout" />
          </form>
        </>
      ) : (
        <LoginForm />
      )}
    </div>
  );
}
