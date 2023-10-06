'use client'

export const submitCookieToStorageRouteHandler = async (cookie: string) => {
  await fetch('http://localhost:3000/api/submitIronSessionCookie', {
    method: 'POST',
    body: JSON.stringify({
      cookie,
    }),
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

export const readCookieFromStorageRouteHandler = async (): Promise<string> => {
  const responseWithCookieFromStorage = await fetch('http://localhost:3000/api/readIronSessionCookie', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })
  const data = await responseWithCookieFromStorage.json();
  const cookieValue = data?.cookieInStorage || 'No Cookie In Storage'
  return cookieValue
}