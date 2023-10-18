import type Koa from "koa";
import { getIronSession } from "iron-session";

export interface Data {
  user?: {
    id: number;
    name: string;
  };
}

export const getSession = async (ctx: Koa.ParameterizedContext) => {
  const session = getIronSession<Data>(ctx.req, ctx.res, {
    password: "ThisIsNotASecurePasswordPleaseChangeIt",
    cookieName: "session",
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
    },
  });
  return session;
};
