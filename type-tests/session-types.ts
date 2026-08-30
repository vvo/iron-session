/**
 * Compile-only test for the shape of `IronSession<T>`.
 *
 * `IronSession<T>` used to be `T & { save, destroy, updateConfig }`, which
 * promised that your data was present. A session that does not exist yet is an
 * empty object, so `session.user.id` typechecked and then threw on a first
 * visit, on an expired cookie, and after `destroy()` (#661).
 */
import { getIronSession, type CookieStore, type IronSession } from "iron-session";

// Deliberately declared with required properties: that is the case #661 is about.
interface Session {
  user: { id: number; email: string };
  visits: number;
}

const options = { cookieName: "session", password: "x".repeat(32) };
declare const store: CookieStore;

export async function readingIsOptional(): Promise<void> {
  const session = await getIronSession<Session>(store, options);

  // @ts-expect-error a session may not exist yet, so `user` can be undefined
  session.user.id;

  // The honest ways to read it all still work.
  session.user?.id;
  if (session.user) {
    const id: number = session.user.id;
    void id;
  }
  const visits: number = session.visits ?? 0;
  void visits;
}

export async function writingThenReadingNarrows(): Promise<void> {
  const session = await getIronSession<Session>(store, options);

  session.user = { id: 1, email: "a@b.c" };
  // Assigning narrows, so this needs no `?.` and no `!`.
  const id: number = session.user.id;
  void id;

  session.visits = (session.visits ?? 0) + 1;
  await session.save();
}

export async function methodsArePresent(): Promise<void> {
  const session: IronSession<Session> = await getIronSession<Session>(store, options);
  await session.save();
  session.destroy();
  session.updateConfig(options);
}

export async function writesAreTypeChecked(): Promise<void> {
  const session = await getIronSession<Session>(store, options);

  // @ts-expect-error `visits` is a number
  session.visits = "three";

  // @ts-expect-error `email` is missing
  session.user = { id: 1 };
}

/**
 * There is no `validate` option on purpose. Validating unsealed data is worth
 * doing, and it is three lines in the wrapper every app already has, so it does
 * not need to be in the library:
 *
 * ```ts
 * export async function getSession() {
 *   const session = await getIronSession<Session>(await cookies(), options);
 *   if (session.user && !SessionSchema.safeParse({ ...session }).success) {
 *     session.destroy();
 *   }
 *   return session;
 * }
 * ```
 */
export const validationIsUserland = true;
