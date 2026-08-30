import type { SessionOptions } from "iron-session";

import { sessionPassword } from "../../passwords";

export interface SessionData {
  username: string;
  isLoggedIn: boolean;
  counter: number;
}

export const defaultSession: SessionData = {
  username: "",
  isLoggedIn: false,
  counter: 0,
};

export const sessionOptions: SessionOptions = {
  // A getter, so the value is read per request: `next build` collects page
  // data without needing the secret, and a request without it still throws.
  get password() {
    return sessionPassword();
  },
  cookieName: "iron-examples-app-router-client-component-route-handler-swr",
  cookieOptions: {
    // `secure: true` is the default and stays on in development: `pnpm dev`
    // serves the examples over real https through portless.
    secure: true,
  },
};

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
