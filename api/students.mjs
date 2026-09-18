import { forwardToAdminEdge } from './_auth.mjs';

export async function GET(req) { return forwardToAdminEdge(req, 'students'); }
export async function POST(req) { return forwardToAdminEdge(req, 'students'); }
export async function PATCH(req) { return forwardToAdminEdge(req, 'students'); }
