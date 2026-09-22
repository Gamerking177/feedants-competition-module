import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError';
import { sendError } from '../utils/response';
import { logger } from '../utils/logger';
import { env } from '../config/env';

/**
 * Centralized error-handling middleware.
 * Handles operational errors, Zod validation errors, body-parser errors,
 * and masks unhandled internal errors in production.
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  // If headers were already sent, delegate to default Express handler
  if (res.headersSent) {
    return _next(err as Error);
  }

  // 1. AppError (operational errors with known status codes and codes)
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error('Operational 5xx error', err, {
        requestId: req.requestId,
        path: req.originalUrl || req.url,
        method: req.method,
      });
    }

    sendError(res, err.message, err.code, err.statusCode, err.errors);
    return;
  }

  // 2. Zod validation error
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    sendError(res, 'Validation failed', 'VALIDATION_ERROR', 400, formattedErrors);
    return;
  }

  // 3. Express body-parser SyntaxError (e.g. malformed JSON)
  if (
    err instanceof SyntaxError &&
    'status' in err &&
    (err as { status: number }).status === 400 &&
    'body' in err
  ) {
    sendError(res, 'Malformed JSON payload in request body', 'INVALID_JSON', 400);
    return;
  }

  // 4. Express body-parser entity too large (payload exceeds limit)
  if (
    typeof err === 'object' &&
    err !== null &&
    'type' in err &&
    (err as { type: string }).type === 'entity.too.large'
  ) {
    sendError(res, 'Request payload exceeds the 10kb limit', 'PAYLOAD_TOO_LARGE', 413);
    return;
  }

  // 5. Mongoose CastError / ValidationError / Duplicate Key (11000)
  if (typeof err === 'object' && err !== null) {
    const errorObj = err as {
      name?: string;
      code?: number;
      keyPattern?: Record<string, unknown>;
      keyValue?: Record<string, unknown>;
      message?: string;
    };

    if (errorObj.code === 11000) {
      const isEmail =
        Boolean(errorObj.keyPattern?.email) ||
        Boolean(errorObj.keyValue?.email) ||
        (typeof errorObj.message === 'string' && errorObj.message.includes('email'));

      if (isEmail) {
        sendError(res, 'Email already registered', 'EMAIL_ALREADY_EXISTS', 409);
        return;
      }

      sendError(res, 'Resource already exists', 'DUPLICATE_RESOURCE', 409);
      return;
    }

    if (errorObj.name === 'CastError') {
      sendError(res, 'Invalid resource identifier format', 'INVALID_ID', 400);
      return;
    }
    if (errorObj.name === 'ValidationError') {
      sendError(res, 'Database validation error', 'VALIDATION_ERROR', 400);
      return;
    }
  }

  // 6. Unhandled / Unexpected Errors
  logger.error('Unhandled application error', err, {
    requestId: req.requestId,
    path: req.originalUrl || req.url,
    method: req.method,
  });

  const isProduction = env.NODE_ENV === 'production';
  const message =
    isProduction
      ? 'Something went wrong'
      : err instanceof Error
      ? err.message
      : 'Internal server error';

  sendError(res, message, 'INTERNAL_SERVER_ERROR', 500);
}

