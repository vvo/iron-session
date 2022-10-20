import Koa from 'koa';
import cors from '@koa/cors';
import body from 'koa-body';
import logger from 'koa-logger';
import { ironSession } from 'iron-session/koa';

import indexRouter from './routes/indexRouter';

const app = new Koa();

const dev = (process.env.NODE_ENV || app.env) != 'production';

app.use(async (ctx, next) => { //Error handling
  try {
    await next();
  } catch(e) {
    ctx.status = e.statusCode || e.status || 500;
    ctx.body = { message: e.message };
    console.log('[!] error', ctx.body);
    if (dev) {
      console.log(e);
    }
  }
});

app.use(logger());
app.use(cors());
app.use(body());
app.use(ironSession({
  cookieName: 'iron-session/examples/koa',
  password: process.env.SECRET_COOKIE_PASSWORD,
  cookieOptions: {
    secure: !dev,
  },
}));

app.use(indexRouter.routes());

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`[*] listening on ${port}`);
});
