import { ApiError, ApiErrorResponse } from './types';

/**
 * Normalized application API error class.
 */
export class AppApiError extends Error implements ApiError {
  readonly status: number;
  readonly code: string;
  readonly message: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'AppApiError';
    this.status = status;
    this.code = code;
    this.message = message;
    this.details = details;

    // Maintain prototype chain
    Object.setPrototypeOf(this, AppApiError.prototype);
  }
}

/**
 * Normalizes any error (network failure, HTTP error, validation, unknown)
 * into a standardized ApiError object suitable for safe UI consumption.
 */
export function normalizeApiError(error: unknown): ApiError {
  // Already normalized AppApiError
  if (error instanceof AppApiError) {
    return {
      status: error.status,
      code: error.code,
      message: error.message,
      details: error.details,
    };
  }

  // Network or fetch connection failure
  if (error instanceof TypeError && error.message.toLowerCase().includes('network')) {
    return {
      status: 0,
      code: 'NETWORK_ERROR',
      message: 'Unable to connect to the server. Please check your internet connection.',
    };
  }

  // Abort / Timeout error
  if (error instanceof Error && error.name === 'AbortError') {
    return {
      status: 0,
      code: 'TIMEOUT_ERROR',
      message: 'Request timed out. Please try again later.',
    };
  }

  // Standard JavaScript Error
  if (error instanceof Error) {
    return {
      status: 500,
      code: 'CLIENT_ERROR',
      message: error.message || 'An unexpected error occurred.',
    };
  }

  // Fallback for non-Error thrown objects
  return {
    status: 500,
    code: 'UNKNOWN_ERROR',
    message: 'An unexpected error occurred. Please try again.',
  };
}

/**
 * Creates an AppApiError from an HTTP response and parsed error body.
 */
export function createHttpApiError(status: number, errorBody?: ApiErrorResponse | null): AppApiError {
  const code = errorBody?.code || getDefaultErrorCode(status);
  const message = errorBody?.message || getDefaultErrorMessage(status);
  const details = errorBody?.errors;

  return new AppApiError(status, code, message, details);
}

function getDefaultErrorCode(status: number): string {
  switch (status) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 422:
      return 'VALIDATION_ERROR';
    case 429:
      return 'RATE_LIMIT_EXCEEDED';
    case 500:
    default:
      return 'INTERNAL_SERVER_ERROR';
  }
}

function getDefaultErrorMessage(status: number): string {
  switch (status) {
    case 400:
      return 'Invalid request. Please verify your input.';
    case 401:
      return 'You are not authorized. Please log in again.';
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return 'Requested resource was not found.';
    case 409:
      return 'A conflict occurred while processing your request.';
    case 422:
      return 'Validation failed for the submitted data.';
    case 429:
      return 'Too many requests. Please slow down and try again later.';
    case 500:
    default:
      return 'A server error occurred. Please try again later.';
  }
}
