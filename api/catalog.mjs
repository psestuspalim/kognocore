import { forwardToAdminEdge } from './_auth.mjs';

export async function GET(req) { return forwardToAdminEdge(req, 'catalog'); }
export async function POST(req) { return forwardToAdminEdge(req, 'catalog'); }
export async function DELETE(req) { return forwardToAdminEdge(req, 'catalog'); }
