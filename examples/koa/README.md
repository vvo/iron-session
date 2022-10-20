# Koa example application using iron-session

This is a small example application providing basic API

The tl;dr; on how to use `iron-session` with Api is this:

```js
import Koa from 'koa';
import Router from '@koa/router';
import { ironSession } from 'iron-session/koa';

const app = new Koa();
const dev = (process.env.NODE_ENV || app.env) != 'production';

app.use(ironSession({
  cookieName: 'iron-session/examples/koa',
  password: process.env.SECRET_COOKIE_PASSWORD,
  cookieOptions: {
    secure: !dev,
  },
}));


const router = new Router();
router
  .get('/', async ctx => {
    ctx.body = { hello: 'world' };
  })
  .get('/login', async ctx => {
    ctx.session.user = { id: 20 };
    await ctx.session.save();
    ctx.body = { message: 'ok' };
  })
  .get('/profile', async ctx => {
    if (ctx?.session?.id) {
      ctx.body = { id: ctx.session.id };
    }
    else {
      ctx.throw(500, { message: 'restricted' });
    }
  })
  .post('/logout', async ctx => {
    ctx.session.destroy();
  });

app.use(router.routes());
app.listen(3000, () => console.log('[*] listening on port', 3000));
```
