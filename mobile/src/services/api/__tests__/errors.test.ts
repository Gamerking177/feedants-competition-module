import { describe, expect, it } from 'vitest';
import { AppApiError, createHttpApiError, normalizeApiError } from '../errors';

describe('API Error Normalization (errors.ts)', () => {
  describe('AppApiError', () => {
    it('should create an AppApiError with status, code, and message', () => {
      const error = new AppApiError(404, 'COMPETITION_NOT_FOUND', 'Competition not found');
      expect(error.status).toBe(404);
      expect(error.code).toBe('COMPETITION_NOT_FOUND');
      expect(error.message).toBe('Competition not found');
      expect(error.name).toBe('AppApiError');
    });
  });

  describe('normalizeApiError', () => {
    it('should return properties of existing AppApiError', () => {
      const appError = new AppApiError(400, 'INVALID_ID', 'Invalid competition ID');
      const normalized = normalizeApiError(appError);
      expect(normalized).toEqual({
        status: 400,
        code: 'INVALID_ID',
        message: 'Invalid competition ID',
        details: undefined,
      });
    });

    it('should normalize network connection failures', () => {
      const networkError = new TypeError('Network request failed');
      const normalized = normalizeApiError(networkError);
      expect(normalized.status).toBe(0);
      expect(normalized.code).toBe('NETWORK_ERROR');
      expect(normalized.message).toContain('Unable to connect to the server');
    });

    it('should normalize timeout AbortError', () => {
      const abortError = new Error('The user aborted a request.');
      abortError.name = 'AbortError';
      const normalized = normalizeApiError(abortError);
      expect(normalized.status).toBe(0);
      expect(normalized.code).toBe('TIMEOUT_ERROR');
      expect(normalized.message).toContain('Request timed out');
    });

    it('should normalize generic errors safely without leaking stack traces', () => {
      const genericError = new Error('Something failed in internal parser');
      const normalized = normalizeApiError(genericError);
      expect(normalized.status).toBe(500);
      expect(normalized.code).toBe('CLIENT_ERROR');
      expect(normalized.message).toBe('Something failed in internal parser');
    });

    it('should handle non-Error objects', () => {
      const normalized = normalizeApiError('Unknown string error');
      expect(normalized.status).toBe(500);
      expect(normalized.code).toBe('UNKNOWN_ERROR');
      expect(normalized.message).toBe('An unexpected error occurred. Please try again.');
    });
  });

  describe('createHttpApiError', () => {
    it('should preserve backend error code and message when provided', () => {
      const error = createHttpApiError(409, {
        success: false,
        code: 'REGISTRATION_CLOSED',
        message: 'Registration window has ended',
      });
      expect(error.status).toBe(409);
      expect(error.code).toBe('REGISTRATION_CLOSED');
      expect(error.message).toBe('Registration window has ended');
    });

    it('should provide default error code and message when response body is empty', () => {
      const error = createHttpApiError(401, null);
      expect(error.status).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.message).toBe('You are not authorized. Please log in again.');
    });

    it('should include validation details when present', () => {
      const errors = [{ field: 'email', message: 'Invalid email' }];
      const error = createHttpApiError(422, {
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        errors,
      });
      expect(error.details).toEqual(errors);
    });
  });
});
