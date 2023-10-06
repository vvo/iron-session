'use server' //remove and set serverActions to false in next.config.js to disable server actions

import { getServerActionSession } from '../../lib/session'

export const submitCookieToStorageServerAction = async (cookie: string) => {
  const session = await getServerActionSession()
  session.cookieVariable = cookie
  await session.save()
}

export const readCookieFromStorageServerAction = async (): Promise<string> => {
  const session = await getServerActionSession()
  return session.cookieVariable || 'No Cookie Stored!'
}
