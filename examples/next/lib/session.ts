import {
  IronSessionOptions, getIronSession, IronSessionData, getServerActionIronSession
} from 'iron-session'

import { cookies } from 'next/headers';

export const sessionOptions: IronSessionOptions = {
  password: 'change-this-this-is-not-a-secure-password',
  cookieName: 'cookieNameInBrowser',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
  },
}

declare module 'iron-session' {
  interface IronSessionData {
    cookieVariable?: string;
  }
}

const getSession = async (req: Request, res: Response) => {
  const session = getIronSession<IronSessionData>(req, res, sessionOptions)
  return session
}

const getServerActionSession = async () => {
  const session = getServerActionIronSession<IronSessionData>(sessionOptions, cookies())
  return session
}

export {
  getSession,
  getServerActionSession
}
