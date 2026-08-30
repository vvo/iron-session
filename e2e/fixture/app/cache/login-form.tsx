"use client";

import { useActionState } from "react";

import { loginWithValidation, type LoginState } from "./actions";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginWithValidation, initialState);

  return (
    <form action={formAction}>
      <input name="username" defaultValue="alison" data-testid="cache-username-input" />
      <button type="submit" disabled={pending} data-testid="cache-login">
        log in
      </button>
      <p data-testid="cache-login-error">{state.error ?? ""}</p>
    </form>
  );
}
