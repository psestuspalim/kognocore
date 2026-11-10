import { consumeInviteRequest } from './_invite-redemption.mjs';
import { recordFailure, tooManyFailures } from './_rate-limit.mjs';

export async function POST(req) {
  const blocked = await tooManyFailures(req, 'redeem', 30);
  if (blocked) return blocked;

  const url = new URL(req.url);
  const validateOnly = url.searchParams.get('create_session') === 'false';
  const response = await consumeInviteRequest(req, { createSession: !validateOnly });
  if (response.status === 401) await recordFailure(req, 'redeem');
  return response;
}
