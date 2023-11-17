"use client";

import { useFormStatus } from "react-dom";
import { getSession } from "./form";
import * as css from "@/app/css";
import { IronSession } from "iron-session";
import { SessionData } from "./lib";

export function LogoutButton(session: IronSession<SessionData>) {
  const { pending } = useFormStatus();

  // async function logout() {
  //   "use server";
  //   // false => no db call for logout
  //   const session = await getSession(false);
  //   await session.destroy();
  // }

  return (
    <form
      onSubmit={() => {
        session.destroy();
      }}
      className={css.form}
    >
      <div>
        <input
          type="submit"
          value={pending ? "Loading..." : "Logout"}
          className={css.button}
          disabled={pending}
        />
      </div>
    </form>
  );
}
