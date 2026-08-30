"use server";

import { chunkedOptions, getSession, secureOptions } from "../session";

export async function login(formData: FormData): Promise<void> {
  const session = await getSession();
  session.username = String(formData.get("username") ?? "anon");
  session.visits = 1;
  await session.save();
}

/** #910: destroy() inside a Server Action POST must clear the browser cookie. */
export async function logout(): Promise<void> {
  const session = await getSession();
  session.destroy();
}

/** #684: a cookies().set() after save() must not lose the session cookie. */
export async function loginThenSetAnotherCookie(): Promise<void> {
  const { cookies } = await import("next/headers");
  const session = await getSession();
  session.username = "ordering";
  session.visits = 1;
  await session.save();

  const store = await cookies();
  store.set("unrelated", "value", { path: "/" });
}

export async function loginBig(): Promise<void> {
  const session = await getSession(chunkedOptions);
  session.username = "chunky";
  session.visits = 1;
  session.blob = "x".repeat(6000);
  await session.save();
}

export async function shrinkBig(): Promise<void> {
  const session = await getSession(chunkedOptions);
  delete session.blob;
  await session.save();
}

/** #870: log in with the default `secure: true` while served over http. */
export async function loginSecure(): Promise<void> {
  const session = await getSession(secureOptions);
  session.username = "secure";
  await session.save();
}
