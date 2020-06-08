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
  cookieOptions?: CookieOptions;

  /** Password of the cookie
   *
   *  Required */
  password: string | { id: number; password: string }[];

  /** Time to live in seconds.
   *
   * Default: 15 days 8 */
  ttl?: number;
};

export type Handler = (req: any, res: any) => any;

export type Session = {
  set: <T = any>(name: string, value: T) => void;
  get: <T = any>(name: string) => T | undefined;
  unset: (name: string) => void;
  destroy: () => void;
  save: () => Promise<void>;
};

export type CookieOptions = {
  /** Forbids JavaScript from accessing the cookie.
   * For example, through the Document.cookie property, the XMLHttpRequest API, or the Request API.
   * This mitigates attacks against cross-site scripting (XSS).
   *
   * Default: true */
  httpOnly?: boolean;

  /** A path that must exist in the requested URL, or the browser won't send the Cookie header.
   *
   * Default: "/" */
  path?: string;

  /** Asserts that a cookie must not be sent with cross-origin requests, providing some protection against cross-site request forgery attacks
   *
   * Default: "lax" */
  sameSite?: "none" | "lax" | "strict";

  /** A secure cookie is only sent to the server when a request is made with the https: scheme.
   *
   * Default: true */
  secure?: boolean;
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
