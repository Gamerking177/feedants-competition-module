import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export const REQUEST_ID_HEADER = 'X-Request-ID';

/**
 * Middleware that assigns a unique request ID to each incoming request.
 * If the client already sends an X-Request-ID header, it is reused;
 * otherwise, a new unique ID with prefix 'req_' is generated.
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const existingId = req.header(REQUEST_ID_HEADER) || req.header('x-request-id');
  const requestId = existingId && existingId.trim().length > 0
    ? existingId.trim()
    : `req_${crypto.randomUUID()}`;

  req.requestId = requestId;
  res.setHeader(REQUEST_ID_HEADER, requestId);

  next();
}
