"use server";

import { getIronSession, sealData } from "iron-session";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { requestOrigin } from "../../request-origin";
import { basePath, magicLinkTokenOptions, sessionOptions, type SessionData } from "./lib";

export interface LinkState {
  link?: string;
  error?: string;
}

export async function createMagicLink(
  _prevState: LinkState,
  formData: FormData,
): Promise<LinkState> {
  const username = String(formData.get("username") ?? "").trim();

  if (username.length < 2) {
    return { error: "Pick a username with at least 2 characters." };
  }

  // Sealed with its own password, never the session one. A link travels through
  // email, referrer headers and chat previews, so it must not double as a
  // session cookie.
  const seal = await sealData({ username }, magicLinkTokenOptions);

  // A real app emails this. Here we render it so you can click it yourself.
  return { link: `${await requestOrigin()}${basePath}/magic-login?seal=${seal}` };
}

export async function logout(): Promise<void> {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

  session.destroy();
  revalidatePath(basePath);
}
