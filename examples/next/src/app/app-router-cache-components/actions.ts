"use server";

import { getIronSession } from "iron-session";
import { cookies } from "next/headers";

import { sessionOptions, type SessionData } from "./lib";

export interface LoginState {
  error?: string;
}

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

/**
 * Shaped for `useActionState`: it takes the previous state and returns the next
 * one, so a validation error can come back to the form instead of being thrown.
 */
export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();

  if (username.length < 2) {
    return { error: "Pick a username with at least 2 characters." };
  }

  const session = await getSession();

  session.username = username;
  session.isLoggedIn = true;
  await session.save();

  // No `revalidatePath` on purpose. The session panel is a dynamic hole, so it
  // re-reads the cookie by itself after the action. Revalidating here would
  // also throw away the cached panel, which is not what we want to show.
  return {};
}

export async function logout(): Promise<void> {
  const session = await getSession();

  session.destroy();
}
