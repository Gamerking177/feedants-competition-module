import { Response } from 'express';

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  message: string;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  code: string;
  errors?: unknown[];
}

/**
 * Sends a standardized success JSON response.
 */
export function sendSuccess<T = unknown>(
  res: Response,
  data: T = {} as T,
  message: string = 'Request successful',
  statusCode: number = 200
): Response {
  const body: ApiSuccessResponse<T> = {
    success: true,
    message,
    data,
  };

  return res.status(statusCode).json(body);
}

/**
 * Sends a standardized error JSON response.
 */
export function sendError(
  res: Response,
  message: string,
  code: string = 'INTERNAL_SERVER_ERROR',
  statusCode: number = 500,
  errors?: unknown[]
): Response {
  const body: ApiErrorResponse = {
    success: false,
    message,
    code,
  };

  if (errors && errors.length > 0) {
    body.errors = errors;
  }

  return res.status(statusCode).json(body);
}
