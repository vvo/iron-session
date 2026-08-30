import { Suspense } from "react";

import { getSession } from "../../session";

/** Proves the session survives a full document navigation. */
export default function Other() {
  return (
    <main>
      <Suspense fallback={<p data-testid="loading">loading</p>}>
        <Content />
      </Suspense>
      <a href="/" data-testid="to-home">
        back
      </a>
    </main>
  );
}

async function Content() {
  const session = await getSession();

  return (
    <>
      <p data-testid="username">{session.username ?? "anonymous"}</p>
      <p data-testid="last-seen">{session.lastSeen ?? "never"}</p>
    </>
  );
}
