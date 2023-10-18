import { getIronSession, createResponse } from "iron-session";

export interface Data {
  user?: {
    id: number;
    name: string;
  };
}

export const getSession = async (req: Request, res: Response) => {
  const session = getIronSession<Data>(req, res, {
    password: "ThisIsNotASecurePasswordPleaseChangeIt",
    cookieName: "session",
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
    },
  });
  return session;
};

export { createResponse };
