import { NextResponse } from 'next/server'
import { getSession } from '../../../../lib/session'

export async function GET(request: Request, response: Response) {
  try {
    const session = await getSession(request, response)
    const cookeValue = session.cookieVariable || 'No Cookie Stored!'
    return NextResponse.json({ cookieInStorage: cookeValue })
  } catch (error: unknown) {
    console.error((error as Error).message)
    return new Response(JSON.stringify({ message: (error as Error).message }), { status: 500 })
  }
}
