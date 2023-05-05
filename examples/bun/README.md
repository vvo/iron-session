# Bun + iron-session

This is a small application providing basic API endpoints to demonstrate how to
use `iron-session` with [Bun](https://bun.sh/).

1. Create a helper function to get the session:

   ```ts
   import { getIronSession } from 'iron-session'

   export interface Data {
     user?: {
       id: number
       name: string
     }
   }

   export const getSession = (req: Request, res: Response) => {
     const session = getIronSession<Data>(req, res, {
       password: 'ThisIsNotASecurePasswordPleaseChangeIt',
       cookieName: 'session',
       cookieOptions: {
         secure: process.env.NODE_ENV === 'production',
       },
     })
     return session
   }
   ```

2. Use the session:

   ```ts
   import type { Serve } from 'bun'
   import { createResponse } from 'iron-session'
   import { getSession } from './lib/session.js'

   export default {
     async fetch(req) {
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
     },
   } satisfies Serve
   ```

<!-- prettier-ignore -->
> **Note**
> The `createResponse` function is used to create a new `Response` object from the existing `Response` object which contains the headers set by `iron-session`.
