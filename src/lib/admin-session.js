// This restores UI state only; API endpoints verify the token signature.
export function readAdminSession(storage = localStorage) {
  const token = storage.getItem('kc_admin_token');
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3 || parts[0] !== 'adm' || !parts[2]) throw new Error('Invalid token');
    const encoded = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(encoded), c => c.charCodeAt(0))));
    if (payload.sub !== 'admin' || !payload.user || !(Date.parse(payload.exp) > Date.now())) throw new Error('Expired token');
    return {
      id: 'admin_local', email: `${payload.user}@kognocore.local`,
      username: payload.user, full_name: payload.user,
      role: 'admin', is_admin: true, auth_provider: 'local'
    };
  } catch {
    storage.removeItem('kc_admin_token');
    return null;
  }
}
