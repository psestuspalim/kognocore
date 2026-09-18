import { forwardToAdminEdge } from './_edge.mjs';

export const GET = req => forwardToAdminEdge(req, 'students');
export const POST = req => forwardToAdminEdge(req, 'students');
export const PATCH = req => forwardToAdminEdge(req, 'students');
