import Router from '@koa/router';

const router = new Router();

router
  .get('/hello', async ctx => {
    ctx.body = { hello: 'world' };
  })
  .get('/login', async ctx => {
    ctx.session.user = { id: 20 };
    await ctx.session.save();
    ctx.body = { message: 'ok' };
  })
  .get('/profile', async ctx => {
    if (ctx.session.user) {
      ctx.body = { user: ctx.session.user };
    }
    else {
      ctx.throw(500, { message: 'restricted' });
    }
  })
  .post('/logout', async ctx => {
    ctx.session.destroy();
  });

export default router;
