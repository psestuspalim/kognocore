import { issueAdminToken } from './_auth.mjs'

const ADMIN_USER = process.env.ADMIN_USER || 'Axayakl'
const ADMIN_PASS = process.env.ADMIN_PASS || 'Tlalpan41.26'

export async function POST(req) {
  try {
    const body = await req.json()
    const username = String(body?.username || '').trim()
    const password = String(body?.password || '')

    if (!username || !password) {
      return new Response(JSON.stringify({ error: 'Credenciales requeridas' }), { status: 400 })
    }

    if (username !== ADMIN_USER || password !== ADMIN_PASS) {
      return new Response(JSON.stringify({ error: 'Credenciales inválidas' }), { status: 401 })
    }

    const token = issueAdminToken(username)
    return new Response(JSON.stringify({ token, role: 'admin', username }), { status: 200 })
  } catch (_e) {
    return new Response(JSON.stringify({ error: 'Bad request' }), { status: 400 })
  }
}

