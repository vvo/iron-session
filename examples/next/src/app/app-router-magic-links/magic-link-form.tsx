"use client";

import { useActionState } from "react";

import * as css from "@/app/css";
import { createMagicLink, type LinkState } from "./actions";

const initialState: LinkState = {};

export function MagicLinkForm() {
  const [state, formAction, pending] = useActionState(createMagicLink, initialState);

  return (
    <div className="space-y-4">
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
          />
        </label>

        {state.error ? <p className="text-red-600 dark:text-red-400">{state.error}</p> : null}

        <div>
          <input
            type="submit"
            value={pending ? "Loading…" : "Get magic login link"}
            disabled={pending}
            className={css.button}
          />
        </div>
      </form>

      {state.link ? (
        <div className="space-y-2 rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-950 p-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            A real app emails this. Open it in a private window to see the login happen with no
            password.
          </p>
          <a href={state.link} className={`${css.link} block text-sm break-all`}>
            {state.link}
          </a>
        </div>
      ) : null}
    </div>
  );
}
