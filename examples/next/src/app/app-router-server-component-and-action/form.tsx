import * as css from "@/app/css";

import { SubmitButton } from "./submit-button";
import { Input } from "./input";
import { getSession, login, logout } from "./actions";

export async function Form() {
  const session = await getSession();

  if (session.isLoggedIn) {
    return (
      <>
        <p className="text-lg">
          Logged in user: <strong>{session.username}</strong>
        </p>
        <LogoutButton />
      </>
    );
  }

  return <LoginForm />;
}

function LoginForm() {
  return (
    <form action={login} className={css.form}>
      <label className="block text-lg">
        <span className={css.label}>Username</span>
        <Input />
      </label>
      <div>
        <SubmitButton value="Login" />
      </div>
    </form>
  );
}

function LogoutButton() {
  return (
    <form action={logout} className={css.form}>
      <div>
        <SubmitButton value="Logout" />
      </div>
    </form>
  );
}
