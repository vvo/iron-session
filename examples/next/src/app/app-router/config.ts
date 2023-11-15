import { IronSessionOptions } from "iron-session";

export interface SessionData {
  username: string;
  isLoggedIn: boolean;
}

export const defaultSession: SessionData = {
  username: "",
  isLoggedIn: false,
};

export const ironSessionOptions: IronSessionOptions = {
  password: "complex_password_at_least_32_characters_long",
  cookieName: "iron-session-examples-app-router",
};
