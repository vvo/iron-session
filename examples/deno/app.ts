import { serve } from 'https://deno.land/std@0.186.0/http/server.ts'
import { getSession, createResponse } from './lib/session.ts'

const handler = async (req: Request) => {
  const url = new URL(req.url)
  const res = new Response()
  const session = await getSession(req, res)

  if (url.pathname === '/') {
    return createResponse(res, 'Hello world')
  }

  if (url.pathname === '/login') {
    session.user = { id: 1, name: 'John Doe' }
    await session.save()
    return createResponse(res, 'Logged in')
  }

  if (url.pathname === '/user') {
    const { user } = session
    if (!user) {
      return createResponse(res, 'Not logged in', { status: 401 })
    }
    return createResponse(res, JSON.stringify({ user }))
  }

  if (url.pathname === '/logout') {
    await session.destroy()
    return createResponse(res, 'Logged out')
  }

  return createResponse(res, 'Not found', { status: 404 })
}

serve(handler)
