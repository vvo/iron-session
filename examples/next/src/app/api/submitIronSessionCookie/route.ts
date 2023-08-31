import { getSession } from '../../../../lib/session'

export async function POST(request: Request) {
  try {
    const requestBody = await request.json()
    const { cookie }: { cookie: string } = requestBody
    const response = new Response()
    const session = await getSession(request, response)
    session.cookieVariable = cookie
    await session.save()
    return response
  } catch (error: unknown) {
    console.error((error as Error).message)
    return new Response(JSON.stringify({ message: (error as Error).message }), { status: 500 })
  }
}
