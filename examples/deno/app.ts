import { serve } from 'https://deno.land/std@0.184.0/http/server.ts'
import { getSession, createResponse } from './lib/session.ts'

const INDEX_ROUTE = new URLPattern({ pathname: '/' })
const LOGIN_ROUTE = new URLPattern({ pathname: '/login' })
const USER_ROUTE = new URLPattern({ pathname: '/user' })
const LOGOUT_ROUTE = new URLPattern({ pathname: '/logout' })

const handler = async (req: Request) => {
  const res = new Response()
  const session = await getSession(req, res)

  if (INDEX_ROUTE.test(req.url)) {
    return createResponse(res, 'Hello world')
  }

  if (LOGIN_ROUTE.test(req.url)) {
    session.user = { id: 1, name: 'John Doe' }
    await session.save()
    return createResponse(res, 'Logged in')
  }

  if (USER_ROUTE.test(req.url)) {
    const { user } = session
    if (!user) {
      return createResponse(res, 'Not logged in', { status: 401 })
    }
    return createResponse(res, JSON.stringify({ user }))
  }

  if (LOGOUT_ROUTE.test(req.url)) {
    await session.destroy()
    return createResponse(res, 'Logged out')
  }

  return createResponse(res, 'Not found', { status: 404 })
}

serve(handler)
