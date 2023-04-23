# Koa + iron-session

This is a small application providing basic API endpoints to demonstrate how to
use `iron-session` with [Koa](https://koajs.com/).

1. Create a helper function to get the session:

   ```js
   import { getIronSession } from 'iron-session'

   export const getSession = (ctx) => {
     return getIronSession(ctx.req, ctx.res, {
       password: process.env.SESSION_SECRET,
       cookieName: 'session',
       cookieOptions: {
         secure: process.env.NODE_ENV === 'production',
       },
     })
   }
   ```

2. Register the middleware:

   ```js
   // ...

   app.use(async (ctx, next) => {
     ctx.session = await getSession(ctx)
     await next()
   })

   // ...
   ```

3. Use the session:

   ```js
   // ...

   router
     .get('/login', async (ctx) => {
       ctx.session.user = { id: 1, name: 'John Doe' } // <-- set the user in the session
       await ctx.session.save() // <-- save the session
       ctx.body = { message: 'Logged in' }
     })

     .get('/user', async (ctx) => {
       const { user } = ctx.session // <-- get the user from the session
       if (!user) {
         ctx.throw(401, 'Not logged in')
         return
       }
       ctx.body = { user }
     })

     .get('/logout', async (ctx) => {
       await ctx.session.destroy() // <-- destroy the session
       ctx.body = { message: 'Logged out' }
     })

   // ...
   ```
