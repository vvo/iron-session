import { SessionData } from "./lib";
import { defaultSession, sessionOptions, sleep } from "./lib";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

/**
 * Reading the session is a cookie unseal. No network, no database, nothing to
 * wait for, so this does not sleep and the page has no loading state to show.
 * The `sleep` below is only on login, where a real app looks a user up.
 */
export async function getSession() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

  if (!session.isLoggedIn) {
    session.isLoggedIn = defaultSession.isLoggedIn;
    session.username = defaultSession.username;
  }

  return session;
}

export async function logout() {
  "use server";

  const session = await getSession();
  session.destroy();
  revalidatePath("/app-router-server-component-and-action");
}

export async function login(formData: FormData) {
  "use server";

  const session = await getSession();

  // Stands in for looking the user up in a database.
  await sleep(250);

  session.username = (formData.get("username") as string) ?? "No username";
  session.isLoggedIn = true;
  await session.save();
  revalidatePath("/app-router-server-component-and-action");
}
