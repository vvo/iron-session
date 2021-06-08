import type { CookieSerializeOptions } from "cookie";

export type SessionOptions = {
  /** Name of the cookie
   *
   * Required */
  cookieName: string;

  /** The options for the cookie
   *
   * Default: {
      httpOnly: true,
      path: "/",
      sameSite: 'lax'
      secure: true
     } */
  cookieOptions?: CookieSerializeOptions;

  /** Password of the cookie
   *
   *  Required */
  password: string | { id: number; password: string }[];

  /** Time to live in seconds.
   *
   * Default: 15 days */
  ttl?: number;
};

export type Handler<Req, Res> = (
  req: Req & { session: Session },
  res: Res,
) => any;

export type Session = {
  set: <T = any>(name: string, value: T) => T;
  get: <T = any>(name: string) => T | undefined;
  unset: (name: string) => void;
  destroy: () => void;
  save: () => Promise<string>;
};

export function applySession(
  req: any,
  res: any,
  sessionOptions: SessionOptions,
): Promise<void>;

export function ironSession(
  sessionOptions: SessionOptions,
): (req: any, res: any, next: any) => void;

export function withIronSession(
  handler: Handler,
  sessionOptions: SessionOptions,
): (...args: any[]) => Promise<any>;
