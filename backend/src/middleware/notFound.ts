import { Request, Response } from 'express';
import { sendError } from '../utils/response';

/**
 * 404 Not Found middleware for undefined routes.
 * Returns standardized API error response.
 */
export function notFoundHandler(req: Request, res: Response): void {
  sendError(
    res,
    `Route not found: ${req.method} ${req.originalUrl || req.url}`,
    'NOT_FOUND',
    404
  );
}
