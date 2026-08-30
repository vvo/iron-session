import { chunkedOptions, getSession, secureOptions } from "../session";
import {
  login,
  loginBig,
  loginSecure,
  loginThenSetAnotherCookie,
  logout,
  shrinkBig,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getSession();
  const chunked = await getSession(chunkedOptions);
  const secure = await getSession(secureOptions);

  return (
    <main>
      <p data-testid="username">{session.username ?? "anonymous"}</p>
      <p data-testid="visits">{session.visits ?? 0}</p>
      <p data-testid="last-seen">{session.lastSeen ?? "never"}</p>
      <p data-testid="blob-length">{chunked.blob?.length ?? 0}</p>
      <p data-testid="chunked-username">{chunked.username ?? "anonymous"}</p>
      <p data-testid="secure-username">{secure.username ?? "anonymous"}</p>

      <form action={login}>
        <input name="username" defaultValue="alison" />
        <button type="submit" data-testid="login">
          log in
        </button>
      </form>

      <form action={logout}>
        <button type="submit" data-testid="logout">
          log out
        </button>
      </form>

      <form action={loginThenSetAnotherCookie}>
        <button type="submit" data-testid="login-then-set">
          log in then set another cookie
        </button>
      </form>

      <form action={loginSecure}>
        <button type="submit" data-testid="login-secure">
          log in with secure: true
        </button>
      </form>

      <form action={loginBig}>
        <button type="submit" data-testid="login-big">
          log in with a big session
        </button>
      </form>

      <form action={shrinkBig}>
        <button type="submit" data-testid="shrink-big">
          shrink the big session
        </button>
      </form>

      <a href="/other" data-testid="to-other">
        go to another page
      </a>
    </main>
  );
}
