import { deepEqual, doesNotMatch, match, rejects } from 'node:assert'
import { mock, test } from 'node:test'
import { getIronSession, sealData } from 'iron-session'

const password = 'Gbm49ATjnqnkCCCdhV4uDBhbfnPqsCW0'
const cookieName = 'test'

interface Data {
  user?: { id: number; meta?: string }
}

const getSession = (req: any, res: any, options: any) => getIronSession<Data>(req, res, options)

test('should throw if the request parameter is missing', async () => {
  // @ts-expect-error
  await rejects(getSession(), /Missing request parameter/)
})

test('should throw if the response parameter is missing', async () => {
  // @ts-expect-error
  await rejects(getSession({}), /Missing response parameter/)
})

test('should throw if the options parameter is missing', async () => {
  // @ts-expect-error
  await rejects(getSession({}, {}), /Missing options/)
})

test('should throw if the cookie name is missing in options', async () => {
  await rejects(getSession({}, {}, {}), /Missing cookie name/)
})

test('should throw if password is missing in options', async () => {
  await rejects(getSession({}, {}, { cookieName }), /Missing password/)
})

test('should throw if password is less than 32 characters', async () => {
  await rejects(
    getSession({}, {}, { cookieName, password: '123456789012345678901234567890' }),
    /Password must be at least 32 characters long/
  )
})

test('should return blank session if no cookie is set', async () => {
  const session = await getSession({ headers: {} }, {}, { cookieName, password })
  deepEqual(session, {})
})

test('should set a cookie in the response object on save', async () => {
  const res = { getHeader: mock.fn(), setHeader: mock.fn() }

  const session = await getSession({ headers: {} }, res, { cookieName, password })
  session.user = { id: 1 }
  await session.save()

  const [name, value] = res.setHeader.mock.calls[0]?.arguments || []
  deepEqual(name, 'set-cookie')
  match(value[0], /^test=.{265}; Max-Age=1209540; Path=\/; HttpOnly; Secure; SameSite=Lax$/)

  mock.reset()
})

test('should allow deleting then saving session data', async () => {
  const res = { getHeader: mock.fn(), setHeader: mock.fn() }

  let session = await getSession({ headers: {} }, res, { cookieName, password })
  session.user = { id: 1 }
  await session.save()

  let cookie = res.setHeader.mock.calls[0]?.arguments[1][0].split(';')[0]
  session = await getSession({ headers: { cookie } }, res, { cookieName, password })
  deepEqual(session, { user: { id: 1 } })

  delete session.user
  await session.save()

  cookie = res.setHeader.mock.calls[1]?.arguments[1][0].split(';')[0]
  session = await getSession({ headers: { cookie } }, res, { cookieName, password })
  deepEqual(session, {})

  mock.reset()
})

test('should set max-age to a large number if ttl is 0', async () => {
  const res = { getHeader: mock.fn(), setHeader: mock.fn() }

  const session = await getSession({ headers: {} }, res, { cookieName, password, ttl: 0 })
  session.user = { id: 1 }
  await session.save()

  const cookie = res.setHeader.mock.calls[0]?.arguments[1][0]
  match(cookie, /Max-Age=2147483647;/)

  mock.reset()
})

test('should respect provided max-age in cookie options', async () => {
  const res = { getHeader: mock.fn(), setHeader: mock.fn() }
  const options = { cookieName, password, cookieOptions: { maxAge: 60 } }

  const session = await getSession({ headers: {} }, res, options)
  session.user = { id: 1 }
  await session.save()

  const cookie = res.setHeader.mock.calls[0]?.arguments[1][0]
  match(cookie, /Max-Age=60;/)

  mock.reset()
})

test('should not set max-age for session cookies', async () => {
  const res = { getHeader: mock.fn(), setHeader: mock.fn() }
  const options = { cookieName, password, cookieOptions: { maxAge: undefined } }

  const session = await getSession({ headers: {} }, res, options)
  session.user = { id: 1 }
  await session.save()

  const cookie = res.setHeader.mock.calls[0]?.arguments[1][0]
  doesNotMatch(cookie, /Max-Age/)

  mock.reset()
})

test('should expire the cookie on destroying the session', async () => {
  const res = { getHeader: mock.fn(), setHeader: mock.fn() }

  const session = await getSession({ headers: {} }, res, { cookieName, password })
  session.user = { id: 1 }
  await session.save()

  let cookie = res.setHeader.mock.calls[0]?.arguments[1][0]
  match(cookie, /Max-Age=1209540;/)

  deepEqual(session, { user: { id: 1 } })
  await session.destroy()
  deepEqual(session, {})

  cookie = res.setHeader.mock.calls[1]?.arguments[1][0]
  match(cookie, /Max-Age=0;/)

  mock.reset()
})

test('should reset the session if the seal is expired', async () => {
  const real = Date.now
  Date.now = () => 0

  const seal = await sealData({ user: { id: 1 } }, { password, ttl: 60 })
  const req = { headers: { cookie: `${cookieName}=${seal}` } }

  let session = await getSession(req, {}, { cookieName, password })
  deepEqual(session, { user: { id: 1 } })

  Date.now = () => 120_000 // = ttl + 60s skew

  session = await getSession(req, {}, { cookieName, password })
  deepEqual(session, {})

  Date.now = real
})

test('should refresh the session (ttl, max-age) on save', async () => {
  const res = { getHeader: mock.fn(), setHeader: mock.fn() }
  const options = { cookieName, password, ttl: 61 }

  const real = Date.now
  Date.now = () => 0

  let session = await getSession({ headers: {} }, res, options)
  session.user = { id: 1 }
  await session.save()

  let cookie = res.setHeader.mock.calls[0]?.arguments[1][0]
  match(cookie, /Max-Age=1;/)

  Date.now = () => 120_000 // < ttl + 60s skew

  session = await getSession({ headers: { cookie: cookie.split(';')[0] } }, res, options)
  deepEqual(session, { user: { id: 1 } })

  await session.save() // session is now valid for another ttl + 60s

  cookie = res.setHeader.mock.calls[1]?.arguments[1][0]
  match(cookie, /Max-Age=1;/) // max-age is relative to the current time

  Date.now = () => 240_000 // < earlier time + ttl + 60s skew

  session = await getSession({ headers: { cookie: cookie.split(';')[0] } }, res, options)
  deepEqual(session, { user: { id: 1 } }) // session is still valid
  // if ttl wasn't refreshed, session would have been reset to {}

  Date.now = real
  mock.reset()
})

test('should reset the session if password is changed', async () => {
  const firstPassword = password
  const secondPassword = '12345678901234567890123456789012'

  const seal = await sealData({ user: { id: 1 } }, { password: firstPassword })
  const req = { headers: { cookie: `${cookieName}=${seal}` } }

  const session = await getSession(req, {}, { cookieName, password: secondPassword })
  deepEqual(session, {})
})

test('should decrypt cookie generated from older password', async () => {
  const firstPassword = password
  const secondPassword = '12345678901234567890123456789012'

  const seal = await sealData({ user: { id: 1 } }, { password: firstPassword })
  const req = { headers: { cookie: `${cookieName}=${seal}` } }

  const passwords = { 2: secondPassword, 1: firstPassword } // rotation
  const session = await getSession(req, {}, { cookieName, password: passwords })
  deepEqual(session, { user: { id: 1 } })
})

test('should throw if the cookie length is too big', async () => {
  const res = { getHeader: mock.fn(), setHeader: mock.fn() }

  const session = await getSession({ headers: {} }, res, { cookieName, password })
  session.user = { id: 1, meta: '0'.repeat(3000) }
  await rejects(session.save(), /Cookie length is too big/)

  mock.reset()
})

test('should throw if trying to save after headers are sent', async () => {
  const session = await getSession({ headers: {} }, { headersSent: true }, { cookieName, password })
  session.user = { id: 1 }

  await rejects(session.save(), /session.save\(\) was called after headers were sent/)
})

test('should keep previously set cookie - single', async () => {
  const existingCookie = 'existing=cookie'
  const res = { getHeader: mock.fn(() => existingCookie), setHeader: mock.fn() }

  const session = await getSession({ headers: {} }, res, { cookieName, password })
  session.user = { id: 1 }
  await session.save()

  let cookies = res.setHeader.mock.calls[0]?.arguments[1]
  deepEqual(cookies[0], existingCookie)
  deepEqual(cookies.length, 2)

  await session.destroy()

  cookies = res.setHeader.mock.calls[1]?.arguments[1]
  deepEqual(cookies[0], existingCookie)
  deepEqual(cookies[1], `${cookieName}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`)

  mock.reset()
})

test('should keep previously set cookies - multiple', async () => {
  const existingCookies = ['existing=cookie', 'existing2=cookie2']
  const res = { getHeader: mock.fn(() => existingCookies), setHeader: mock.fn() }

  const session = await getSession({ headers: {} }, res, { cookieName, password })
  session.user = { id: 1 }
  await session.save()

  let cookies = res.setHeader.mock.calls[0]?.arguments[1]
  deepEqual(cookies[0], existingCookies[0])
  deepEqual(cookies[1], existingCookies[1])
  deepEqual(cookies.length, 3)

  await session.destroy()

  cookies = res.setHeader.mock.calls[1]?.arguments[1]
  deepEqual(cookies[0], existingCookies[0])
  deepEqual(cookies[1], existingCookies[1])
  deepEqual(cookies[2], `${cookieName}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`)

  mock.reset()
})

test('should be backwards compatible with older cookie format', async () => {
  // this seal is in the old next-iron-session format (generated with ttl: 0)
  const cookie = `${cookieName}=Fe26.2*1*1e2bacee1edffaeb4a9ba4a07dc36c2c60d20415a60ac1b901033af1f107ead5*LAC9Fn3BJ9ifKMhVL3pP5w*JHhcByIzk4ThLt9rUW-fDMrOwUT7htHy1uyqeOTIqrVwDJ0Bz7TOAwIz_Cos-ug3**7dfa11868bbcc4f7e118342c0280ff49ba4a7cc84c70395bbc3d821a5f460174*6a8FkHxdg322jyym6PwJf3owz7pd6nq5ZIzyLHGVC0c`

  const session = await getSession({ headers: { cookie } }, {}, { cookieName, password })
  deepEqual(session, { user: { id: 77 } })
})

test('should prevent reassignment of save/destroy functions', async () => {
  const session = await getSession({ headers: {} }, {}, { cookieName, password })

  await rejects(async () => {
    // @ts-expect-error
    session.save = () => {}
  }, /Cannot assign to read only property 'save' of object '#<Object>'/)

  await rejects(async () => {
    // @ts-expect-error
    session.destroy = () => {}
  }, /Cannot assign to read only property 'destroy' of object '#<Object>'/)
})
