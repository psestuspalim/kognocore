import { createClient } from '@supabase/supabase-js';

// Helper to use Web Crypto API for SHA-256 hashing
async function hashText(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function POST(request) {
    try {
        const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CODE_PEPPER } = process.env;

        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !CODE_PEPPER) {
            console.error('Missing required environment variables');
            return new Response(JSON.stringify({ error: "Configuración del servidor incompleta" }), {
                status: 500,
                headers: { "Content-Type": "application/json" }
            });
        }

        // Parse JSON body
        const body = await request.json();
        const { code } = body;

        if (!code) {
            return new Response(JSON.stringify({ error: "El código es requerido" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        const upperCode = code.toUpperCase();

        // 1. Hash the incoming code with the pepper
        const codeHash = await hashText(`${upperCode}${CODE_PEPPER}`);

        // 2. Initialize Supabase Admin Client
        const supabaseContext = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
            auth: { persistSession: false }
        });

        // 3. Look up the code in the 'invites' table
        const { data: invite, error: inviteError } = await supabaseContext
            .from('invites')
            .select('*')
            .eq('code_hash', codeHash)
            .single();

        if (inviteError || !invite) {
            return new Response(JSON.stringify({ error: "Código inválido" }), {
                status: 404,
                headers: { "Content-Type": "application/json" }
            });
        }

        // Check expiration and usage limits
        const now = new Date();
        if (invite.expires_at && new Date(invite.expires_at) < now) {
            return new Response(JSON.stringify({ error: "Este código ha expirado" }), {
                status: 403,
                headers: { "Content-Type": "application/json" }
            });
        }

        // Since we handle usage via 'sessions' count or simple update, let's verify uses
        const { count: currentUses } = await supabaseContext
            .from('sessions')
            .select('*', { count: 'exact', head: true })
            .eq('course_id', invite.course_id); // Simplified check, assumes one invite per course logic or tracked differently

        if (currentUses >= invite.max_uses) {
            return new Response(JSON.stringify({ error: "Este código ha alcanzado su límite de usos" }), {
                status: 403,
                headers: { "Content-Type": "application/json" }
            });
        }

        // 4. Generate a session token
        const rawToken = crypto.randomUUID();
        const tokenHash = await hashText(`${rawToken}${process.env.TOKEN_SIGNING_SECRET}`);

        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours session

        // 5. Store the hashed session token
        const { error: sessionError } = await supabaseContext
            .from('sessions')
            .insert({
                token_hash: tokenHash,
                course_id: invite.course_id,
                expires_at: expiresAt.toISOString()
            });

        if (sessionError) {
            console.error(sessionError);
            throw new Error("Error creando la sesión");
        }

        // Update invite last used timestamp
        await supabaseContext
            .from('invites')
            .update({ used_at: new Date().toISOString() })
            .eq('id', invite.id);

        return new Response(JSON.stringify({
            success: true,
            message: "Código canjeado con éxito",
            token: rawToken, // Give raw token to client
            courseDetails: {
                id: invite.course_id
            }
        }), {
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
