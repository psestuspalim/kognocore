import crypto from 'crypto';

function hmac(value) {
  return crypto.createHmac('sha256', process.env.TOKEN_SIGNING_SECRET).update(value).digest('hex');
}

function toBase64Url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function POST(req) {
  try {
    const { username, password } = await req.json();
    if (!username || !password) {
      return Response.json({ error: 'Campos requeridos' }, { status: 400 });
    }

    const expectedUser = process.env.ADMIN_USERNAME;
    const expectedPass = process.env.ADMIN_PASSWORD;
    if (!expectedUser || !expectedPass || !process.env.TOKEN_SIGNING_SECRET) {
      return Response.json({ error: 'El acceso administrativo no está configurado en el servidor.' }, { status: 503 });
    }

    const uHash = crypto.createHash('sha256').update(username.trim().toLowerCase()).digest();
    const uExpected = crypto.createHash('sha256').update(expectedUser.trim().toLowerCase()).digest();
    const pHash = crypto.createHash('sha256').update(password).digest();
    const pExpected = crypto.createHash('sha256').update(expectedPass).digest();
    const userMatch = crypto.timingSafeEqual(uHash, uExpected);
    const passMatch = crypto.timingSafeEqual(pHash, pExpected);

    if (!userMatch || !passMatch) {
      return Response.json({ error: 'Usuario o contraseña incorrectos' }, { status: 401 });
    }

    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    const payload = JSON.stringify({ sub: 'admin', user: expectedUser, exp: expiresAt });
    const payloadB64 = toBase64Url(payload);
    const signature = hmac(payloadB64);
    const token = `adm.${payloadB64}.${signature}`;

    return Response.json({
      token,
      expiresAt,
      user: {
        id: 'admin_local',
        username: expectedUser,
        full_name: expectedUser,
        role: 'admin',
        is_admin: true,
        auth_provider: 'local'
      }
    }, { status: 200 });
  } catch (e) {
    return Response.json({ error: 'Solicitud inválida' }, { status: 400 });
  }
}
