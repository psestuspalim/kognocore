import { consumeInviteRequest } from './_invite-redemption.mjs';

export async function POST(req) {
  const url = new URL(req.url);
  const validateOnly = url.searchParams.get('create_session') === 'false';
  return consumeInviteRequest(req, { createSession: !validateOnly });
}
