import Koa from 'koa'
import Router from '@koa/router'
import { getSession } from './lib/session.js'

type Context = Koa.DefaultContext & { session: Awaited<ReturnType<typeof getSession>> }

const app = new Koa<Koa.DefaultState, Context>()
const router = new Router<Koa.DefaultState, Context>()

app
  .use(async (ctx, next) => {
    try {
      await next()
    } catch (e: any) {
      console.error(e)
      ctx.status = e.statusCode ?? e.status ?? 500
      ctx.body = { message: e.message }
    }
  })
  .use(async (ctx, next) => {
    ctx.session = await getSession(ctx)
    await next()
  })

router
  .get('/', async (ctx) => {
    ctx.body = { message: 'Hello world' }
  })
  .get('/login', async (ctx) => {
    ctx.session.user = { id: 1, name: 'John Doe' }
    await ctx.session.save()
    ctx.body = { message: 'Logged in' }
  })
  .get('/user', async (ctx) => {
    const { user } = ctx.session
    if (!user) {
      ctx.throw(401, 'Not logged in')
      return
    }
    ctx.body = { user }
  })
  .get('/logout', async (ctx) => {
    ctx.session.destroy()
    ctx.body = { message: 'Logged out' }
  })

app.use(router.routes()).use(router.allowedMethods())

app.listen(3000)
