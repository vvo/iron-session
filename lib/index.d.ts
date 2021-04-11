import { IncomingMessage, ServerResponse } from "http";

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
   * Default: 15 days */
  ttl?: number;
};

/**
 * This the NextApiRequest with Session type and NextApiResponse
 * This is stright from Next.js 'next/next-server/util.d.ts'
 */
type Env = {
  [key: string]: string;
};
export interface WithNextApiRequest extends IncomingMessage {
  query: {
    [key: string]: string | string[];
  };
  cookies: {
    [key: string]: string;
  };
  body: any;
  env: Env;
  preview?: boolean;
  previewData?: any;
  session: Session;
}
type Send<T> = (body: T) => void;
export type NextApiResponse<T = any> = ServerResponse & {
  send: Send<T>;
  json: Send<T>;
  status: (statusCode: number) => NextApiResponse<T>;
  redirect(url: string): NextApiResponse<T>;
  redirect(status: number, url: string): NextApiResponse<T>;

  setPreviewData: (
    data: object | string,
    options?: {
      maxAge?: number;
    },
  ) => NextApiResponse<T>;
  clearPreviewData: () => NextApiResponse<T>;
};
export type Handler<T = any> = (
  req: WithNextApiRequest,
  res: NextApiResponse<T>,
) => void | Promise<void>;

export type Session = {
  set: <T = any>(name: string, value: T) => T;
  get: <T = any>(name?: string) => T | undefined;
  unset: (name: string) => void;
  destroy: () => void;
  save: () => Promise<string>;
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

  /**
   * Specifies the number (in seconds) to be the value for the Max-Age Set-Cookie attribute. The given number will be converted to an integer by rounding down. By default, it will be 15 days by default
   */
  maxAge?: number;
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
