/*
 * A per-process secret for calling our own API route handlers directly from
 * server code (the search agents run the Deal-motor search in-process). It is
 * random on every start and never leaves the server, so a request from outside
 * can never carry it.
 */
export const INTERNAL_HEADER = "x-ni-internal";
const g = globalThis as unknown as { __niInternal?: string };
export const internalToken: string = g.__niInternal ?? (g.__niInternal = crypto.randomUUID() + crypto.randomUUID());

export const isInternal = (req: Request) => req.headers.get(INTERNAL_HEADER) === internalToken;
