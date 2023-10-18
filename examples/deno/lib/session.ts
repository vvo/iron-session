// @deno-types="../../../dist/index.d.ts"
import {
  getIronSession,
  createResponse,
  // eslint-disable-next-line import/no-relative-packages
} from "../../../dist/index.js";

export interface Data {
  user?: {
    id: number;
    name: string;
  };
}

export const getSession = async (req: Request, res: Response) => {
  return getIronSession<Data>(req, res, {
    password: "ThisIsNotASecurePasswordPleaseChangeIt",
    cookieName: "session",
    cookieOptions: {
      secure: !!Deno.env.get("DENO_DEPLOYMENT_ID"),
    },
  });
};

export { createResponse };
