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
  password: sessionPassword(),
  cookieName: "iron-examples-app-router-client-component-route-handler-swr",
  cookieOptions: {
    // secure only works in `https` environments
    // if your localhost is not on `https`, then use: `secure: process.env.NODE_ENV === "production"`
    secure: true,
  },
};

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
