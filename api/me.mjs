import { createClient } from '@supabase/supabase-js';

// Helper to use Web Crypto API for SHA-256 hashing
async function hashText(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function GET(request) {
    try {
        const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TOKEN_SIGNING_SECRET } = process.env;

        // Extract raw token from Authorization header
        const authHeader = request.headers.get('authorization');
        const rawToken = authHeader ? authHeader.replace('Bearer ', '') : null;

        if (!rawToken) {
            return new Response(JSON.stringify({ error: "No autorizado" }), {
                status: 401,
                headers: { "Content-Type": "application/json" }
            });
        }

        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !TOKEN_SIGNING_SECRET) {
            console.error('Missing required environment variables');
            return new Response(JSON.stringify({ error: "Configuración del servidor incompleta" }), {
                status: 500,
                headers: { "Content-Type": "application/json" }
            });
        }

        // 1. Hash the incoming raw token to compare against DB
        const tokenHash = await hashText(`${rawToken}${TOKEN_SIGNING_SECRET}`);

        // 2. Initialize Supabase Admin Client
        const supabaseContext = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
            auth: { persistSession: false }
        });

        // 3. Query the 'sessions' table
        const { data: session, error: sessionError } = await supabaseContext
            .from('sessions')
            .select('*')
            .eq('token_hash', tokenHash)
            .single();

        if (sessionError || !session) {
            return new Response(JSON.stringify({ error: "Sesión inválida o inactiva" }), {
                status: 401,
                headers: { "Content-Type": "application/json" }
            });
        }

        // 4. Check expiration
        if (new Date(session.expires_at) < new Date()) {
            return new Response(JSON.stringify({ error: "Sesión expirada" }), {
                status: 401,
                headers: { "Content-Type": "application/json" }
            });
        }

        // Mock returning some student data associated with this session context
        const user = {
            id: "usr_session_" + session.id.substring(0, 8),
            role: "student",
            course_id: session.course_id,
            isAuthenticated: true
        };

        return new Response(JSON.stringify(user), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({ error: "Error interno del servidor" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
