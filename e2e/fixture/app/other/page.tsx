import { getSession } from "../../session";

export const dynamic = "force-dynamic";

/** Proves the session survives a full document navigation. */
export default async function Other() {
  const session = await getSession();

  return (
    <main>
      <p data-testid="username">{session.username ?? "anonymous"}</p>
      <p data-testid="last-seen">{session.lastSeen ?? "never"}</p>
      <a href="/" data-testid="to-home">
        back
      </a>
    </main>
  );
}
