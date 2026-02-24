import { unauthorizedResponse, verifyRequestAuth } from './_auth.mjs'

export async function GET(req) {
    const auth = await verifyRequestAuth(req)
    if (!auth.ok) return unauthorizedResponse(auth)
    if (auth.role === 'admin') {
        return new Response(JSON.stringify({ role: 'admin', username: auth.username || 'admin' }), { status: 200 })
    }
    return new Response(JSON.stringify({ courseId: auth.courseId, role: 'user' }), { status: 200 })
}
