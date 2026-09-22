import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import { Request, Response } from 'express';
import { sendError } from '../utils/response';

export interface RateLimiterOptions {
  windowMs: number;
  max: number;
  message?: string;
  code?: string;
}

/**
 * Creates a reusable rate limiter middleware with standardized error responses.
 */
export function createRateLimiter(options: RateLimiterOptions): RateLimitRequestHandler {
  const {
    windowMs,
    max,
    message = 'Too many requests from this IP, please try again later.',
    code = 'TOO_MANY_REQUESTS',
  } = options;

  return rateLimit({
    windowMs,
    max,
    standardHeaders: true, // Return standard RateLimit headers in the `RateLimit-*` format
    legacyHeaders: false,  // Disable the `X-RateLimit-*` headers
    handler: (_req: Request, res: Response) => {
      sendError(res, message, code, 429);
    },
  });
}

/**
 * Global rate limiter: 100 requests per 15 minutes per IP by default.
 */
export const globalRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again after 15 minutes.',
  code: 'RATE_LIMIT_EXCEEDED',
});
