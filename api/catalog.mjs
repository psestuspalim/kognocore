import { forwardToAdminEdge } from './_edge.mjs';

export const GET = req => forwardToAdminEdge(req, 'catalog');
export const POST = req => forwardToAdminEdge(req, 'catalog');
export const DELETE = req => forwardToAdminEdge(req, 'catalog');
