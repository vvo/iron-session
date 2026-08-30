import { getSession, secureOptions } from "../../../session";

/** A curl-able version of the secure login, so the raw header can be inspected. */
export async function GET(): Promise<Response> {
  const session = await getSession(secureOptions);
  session.username = "secure";
  await session.save();
  return Response.json({ ok: true });
}
