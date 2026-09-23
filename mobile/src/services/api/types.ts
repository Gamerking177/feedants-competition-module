/**
 * Standard API error model for Feedants Mobile.
 *
 * Encapsulates HTTP status, backend error code, user-friendly message,
 * and optional validation details.
 */
export interface ApiError {
  status: number;
  code: string;
  message: string;
  details?: unknown;
}

/**
 * Standard backend success envelope.
 * Matches backend `sendSuccess` response shape.
 */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  message: string;
  data: T;
}

/**
 * Standard backend error envelope.
 * Matches backend `sendError` response shape.
 */
export interface ApiErrorResponse {
  success: false;
  message: string;
  code: string;
  errors?: unknown[];
}

/**
 * Common request options for API client.
 */
export interface RequestOptions extends Omit<RequestInit, 'body'> {
  headers?: Record<string, string>;
  skipAuth?: boolean;
}
