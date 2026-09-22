import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'token',
  'accesstoken',
  'authorization',
  'cookie',
  'jwt_secret',
  'mongodb_uri',
  'secret',
  'credentials',
  'apikey',
]);

/**
 * Recursively redacts sensitive fields from objects before logging.
 */
export function sanitize(data: unknown): unknown {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitize(item));
  }

  if (typeof data === 'object') {
    const sanitizedObj: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        sanitizedObj[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitizedObj[key] = sanitize(value);
      } else {
        sanitizedObj[key] = value;
      }
    }
    return sanitizedObj;
  }

  return data;
}

const COLORS = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  info: '\x1b[32m',    // green
  warn: '\x1b[33m',    // yellow
  error: '\x1b[31m',   // red
  debug: '\x1b[36m',   // cyan
};

function formatLogMessage(
  level: LogLevel,
  message: string,
  meta?: Record<string, unknown>
): string {
  const timestamp = new Date().toISOString();
  const sanitizedMeta = meta ? (sanitize(meta) as Record<string, unknown>) : undefined;

  if (env.NODE_ENV === 'production') {
    const logObject: Record<string, unknown> = {
      timestamp,
      level,
      message,
      ...(sanitizedMeta || {}),
    };
    return JSON.stringify(logObject);
  }

  // Development / Test mode: clean, human-readable format
  const color = COLORS[level] || COLORS.reset;
  const levelTag = `${color}[${level.toUpperCase()}]${COLORS.reset}`;
  const timeTag = `${COLORS.dim}${timestamp}${COLORS.reset}`;
  const reqTag = sanitizedMeta?.requestId
    ? ` ${COLORS.dim}(${sanitizedMeta.requestId})${COLORS.reset}`
    : '';

  const metaCopy = sanitizedMeta ? { ...sanitizedMeta } : undefined;
  if (metaCopy && 'requestId' in metaCopy) {
    delete metaCopy.requestId;
  }

  const metaStr =
    metaCopy && Object.keys(metaCopy).length > 0
      ? `\n  ${JSON.stringify(metaCopy, null, 2).replace(/\n/g, '\n  ')}`
      : '';

  return `${timeTag} ${levelTag}${reqTag} ${message}${metaStr}`;
}

export const logger = {
  info(message: string, meta?: Record<string, unknown>): void {
    console.log(formatLogMessage('info', message, meta));
  },

  warn(message: string, meta?: Record<string, unknown>): void {
    console.warn(formatLogMessage('warn', message, meta));
  },

  error(message: string, error?: unknown, meta?: Record<string, unknown>): void {
    const errorMeta: Record<string, unknown> = { ...(meta || {}) };

    if (error instanceof Error) {
      errorMeta.errorMessage = error.message;
      if (env.NODE_ENV !== 'production' && error.stack) {
        errorMeta.stack = error.stack;
      }
    } else if (error !== undefined) {
      errorMeta.errorDetail = error;
    }

    console.error(formatLogMessage('error', message, errorMeta));
  },

  debug(message: string, meta?: Record<string, unknown>): void {
    if (env.NODE_ENV !== 'production') {
      console.debug(formatLogMessage('debug', message, meta));
    }
  },
};

/**
 * HTTP request logging middleware
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - startTime;

    logger.info('HTTP Request', {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode: res.statusCode,
      duration: `${durationMs}ms`,
      durationMs,
    });
  });

  next();
}
