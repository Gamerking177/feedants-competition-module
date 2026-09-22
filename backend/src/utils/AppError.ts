export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly errors?: unknown[];

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_SERVER_ERROR',
    errors?: unknown[]
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    this.errors = errors;

    Error.captureStackTrace(this, this.constructor);
  }

  public static badRequest(
    message: string = 'Bad request',
    code: string = 'BAD_REQUEST',
    errors?: unknown[]
  ): AppError {
    return new AppError(message, 400, code, errors);
  }

  public static unauthorized(
    message: string = 'Unauthorized',
    code: string = 'UNAUTHORIZED'
  ): AppError {
    return new AppError(message, 401, code);
  }

  public static forbidden(
    message: string = 'Forbidden',
    code: string = 'FORBIDDEN'
  ): AppError {
    return new AppError(message, 403, code);
  }

  public static notFound(
    message: string = 'Resource not found',
    code: string = 'NOT_FOUND'
  ): AppError {
    return new AppError(message, 404, code);
  }

  public static conflict(
    message: string = 'Resource conflict',
    code: string = 'CONFLICT'
  ): AppError {
    return new AppError(message, 409, code);
  }

  public static payloadTooLarge(
    message: string = 'Payload too large',
    code: string = 'PAYLOAD_TOO_LARGE'
  ): AppError {
    return new AppError(message, 413, code);
  }

  public static tooManyRequests(
    message: string = 'Too many requests, please try again later',
    code: string = 'TOO_MANY_REQUESTS'
  ): AppError {
    return new AppError(message, 429, code);
  }

  public static validationError(
    errors: unknown[],
    message: string = 'Validation failed'
  ): AppError {
    return new AppError(message, 400, 'VALIDATION_ERROR', errors);
  }

  public static internal(
    message: string = 'Something went wrong',
    code: string = 'INTERNAL_SERVER_ERROR'
  ): AppError {
    const err = new AppError(message, 500, code);
    return err;
  }
}
