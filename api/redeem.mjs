import { consumeInviteRequest } from './_invite-redemption.mjs';

export async function POST(req) {
  return consumeInviteRequest(req, { createSession: true });
}
