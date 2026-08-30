"use server";

import { getSession } from "../../session";

export interface LoginState {
  error?: string;
}

/**
 * `useActionState` shape: previous state in, next state out. A rejected
 * username has to come back as a message and leave the session untouched.
 */
export async function loginWithValidation(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const raw = formData.get("username");
  const username = typeof raw === "string" ? raw.trim() : "";

  if (username.length < 2) {
    return { error: "too short" };
  }

  const session = await getSession();
  session.username = username;
  session.visits = 1;
  await session.save();

  return {};
}
