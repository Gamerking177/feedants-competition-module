import { describe, it, expect } from 'vitest';
import express, { Request, Response } from 'express';
import request from 'supertest';
import { AppError } from '../src/utils/AppError';
import { sanitize } from '../src/utils/logger';
import { sendSuccess, sendError } from '../src/utils/response';
import { requestIdMiddleware, REQUEST_ID_HEADER } from '../src/utils/requestId';

describe('Utility Tests', () => {
  describe('AppError', () => {
    it('should initialize with default parameters', () => {
      const err = new AppError('Server error');
      expect(err.message).toBe('Server error');
      expect(err.statusCode).toBe(500);
      expect(err.code).toBe('INTERNAL_SERVER_ERROR');
      expect(err.isOperational).toBe(true);
      expect(err.errors).toBeUndefined();
    });

    it('should create specific operational errors with static factories', () => {
      const badReq = AppError.badRequest('Invalid input', 'BAD_REQUEST', [{ field: 'id' }]);
      expect(badReq.statusCode).toBe(400);
      expect(badReq.code).toBe('BAD_REQUEST');
      expect(badReq.errors).toEqual([{ field: 'id' }]);

      const unauth = AppError.unauthorized();
      expect(unauth.statusCode).toBe(401);
      expect(unauth.code).toBe('UNAUTHORIZED');

      const notFound = AppError.notFound();
      expect(notFound.statusCode).toBe(404);
      expect(notFound.code).toBe('NOT_FOUND');

      const conflict = AppError.conflict();
      expect(conflict.statusCode).toBe(409);
      expect(conflict.code).toBe('CONFLICT');

      const rateLimit = AppError.tooManyRequests();
      expect(rateLimit.statusCode).toBe(429);
      expect(rateLimit.code).toBe('TOO_MANY_REQUESTS');
    });
  });

  describe('Logger Sensitive Data Sanitization', () => {
    it('should redact sensitive keys recursively', () => {
      const sensitiveData = {
        username: 'alice',
        password: 'superSecretPassword123',
        nested: {
          token: 'jwt-bearer-token',
          MONGODB_URI: 'mongodb://user:pass@localhost:27017',
          safeKey: 'this-is-fine',
        },
        authorization: 'Bearer xyz',
      };

      const sanitized = sanitize(sensitiveData) as Record<string, unknown>;

      expect(sanitized.username).toBe('alice');
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.authorization).toBe('[REDACTED]');

      const nested = sanitized.nested as Record<string, unknown>;
      expect(nested.token).toBe('[REDACTED]');
      expect(nested.MONGODB_URI).toBe('[REDACTED]');
      expect(nested.safeKey).toBe('this-is-fine');
    });
  });

  describe('Standard Response Helpers', () => {
    const testApp = express();

    testApp.get('/test-success', (_req: Request, res: Response) => {
      sendSuccess(res, { item: 123 }, 'Found');
    });

    testApp.get('/test-error', (_req: Request, res: Response) => {
      sendError(res, 'Failed', 'CUSTOM_CODE', 400, [{ issue: 'invalid' }]);
    });

    it('sendSuccess should format standard success response', async () => {
      const res = await request(testApp).get('/test-success');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        message: 'Found',
        data: { item: 123 },
      });
    });

    it('sendError should format standard error response', async () => {
      const res = await request(testApp).get('/test-error');
      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        success: false,
        message: 'Failed',
        code: 'CUSTOM_CODE',
        errors: [{ issue: 'invalid' }],
      });
    });
  });

  describe('Request ID Middleware', () => {
    const testApp = express();
    testApp.use(requestIdMiddleware);
    testApp.get('/test-req-id', (req: Request, res: Response) => {
      res.json({ id: req.requestId });
    });

    it('should generate a req_ prefixed UUID when none is supplied', async () => {
      const res = await request(testApp).get('/test-req-id');
      expect(res.body.id).toMatch(/^req_/);
      expect(res.headers[REQUEST_ID_HEADER.toLowerCase()]).toBe(res.body.id);
    });

    it('should reuse client supplied X-Request-ID', async () => {
      const clientReqId = 'client-uuid-999';
      const res = await request(testApp)
        .get('/test-req-id')
        .set(REQUEST_ID_HEADER, clientReqId);

      expect(res.body.id).toBe(clientReqId);
      expect(res.headers[REQUEST_ID_HEADER.toLowerCase()]).toBe(clientReqId);
    });
  });
});
