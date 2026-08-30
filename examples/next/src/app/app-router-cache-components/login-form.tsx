"use client";

import { useActionState } from "react";

import * as css from "@/app/css";
import { login, type LoginState } from "./actions";

const initialState: LoginState = {};

/**
 * `useActionState` replaces the `useFormStatus`-only pattern: it gives you the
 * pending flag *and* whatever the action returned, so a rejected login renders
 * a message instead of throwing.
 */
export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form action={formAction} className={css.form}>
      <label className="block text-lg">
        <span className={css.label}>Username</span>
        <input
          type="text"
          name="username"
          defaultValue="Alison"
          disabled={pending}
          className={css.input}
          required
          autoComplete="off"
          data-1p-ignore
          data-testid="username-input"
        />
      </label>

      {state.error ? (
        <p className="text-red-600 dark:text-red-400" data-testid="login-error">
          {state.error}
        </p>
      ) : null}

      <div>
        <input
          type="submit"
          value={pending ? "Loading…" : "Login"}
          disabled={pending}
          className={css.button}
          data-testid="login"
        />
      </div>
    </form>
  );
}
