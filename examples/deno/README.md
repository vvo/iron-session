# Deno + iron-session

This is a small application providing basic API endpoints to demonstrate how to
use `iron-session` with [Deno](https://deno.land/).

1. Create a helper function to get the session:

   ```ts
   import { getIronSession } from 'https://esm.sh/iron-session@latest'

   export interface Data {
     user?: {
       id: number
       name: string
     }
   }

   export const getSession = (req: Request, res: Response) => {
     const session = getIronSession<Data>(req, res, {
       password: Deno.env.get('SESSION_SECRET')!,
       cookieName: 'session',
       cookieOptions: {
         secure: !!Deno.env.get('DENO_DEPLOYMENT_ID'),
       },
     })
     return session
   }
   ```

2. Use the session:

   ```ts
   import { serve } from 'https://deno.land/std@0.184.0/http/server.ts'
   import { createResponse } from 'https://esm.sh/iron-session@latest'
   import { getSession } from './lib/session.ts'

   const handler = async (req: Request) => {
     const url = new URL(req.url)
     const res = new Response()
     const session = await getSession(req, res)

     if (url.pathname === '/') {
       return createResponse(res, 'Hello world')
     }

     if (url.pathname === '/login') {
       session.user = { id: 1, name: 'John Doe' } // <-- set the user in the session
       await session.save() // <-- save the session
       return createResponse(res, 'Logged in')
     }

     if (url.pathname === '/user') {
       const { user } = session // <-- get the user from the session
       if (!user) {
         return createResponse(res, 'Not logged in', { status: 401 })
       }
       return createResponse(res, JSON.stringify({ user }))
     }

     if (url.pathname === '/logout') {
       await session.destroy() // <-- destroy the session
       return createResponse(res, 'Logged out')
     }

     return createResponse(res, 'Not found', { status: 404 })
   }

   serve(handler)
   ```

<!-- prettier-ignore -->
> **Note**
> The `createResponse` function is used to create a new `Response` object from the existing `Response` object which contains the headers set by `iron-session`.
