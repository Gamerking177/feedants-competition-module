import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import express, { Request, Response } from 'express';
import { z } from 'zod';
import app from '../src/app';
import { validate } from '../src/middleware/validate';
import { errorHandler } from '../src/middleware/errorHandler';
import { sendSuccess } from '../src/utils/response';

describe('Middleware Tests', () => {
  describe('404 Not Found Handler', () => {
    it('should return standardized 404 for unknown routes', async () => {
      const response = await request(app).get('/api/v1/unknown-route');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        success: false,
        message: expect.stringContaining('Route not found: GET /api/v1/unknown-route'),
        code: 'NOT_FOUND',
      });
      expect(response.headers['x-request-id']).toBeDefined();
    });
  });

  describe('Malformed JSON Handler', () => {
    it('should return 400 Bad Request with INVALID_JSON for malformed JSON body', async () => {
      const response = await request(app)
        .post('/api/v1')
        .set('Content-Type', 'application/json')
        .send('{"invalidJson": ');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        message: 'Malformed JSON payload in request body',
        code: 'INVALID_JSON',
      });
    });
  });

  describe('Payload Too Large Handler', () => {
    it('should reject request bodies exceeding 10kb limit with 413 PAYLOAD_TOO_LARGE', async () => {
      // 11KB string to trigger limit
      const largePayload = { data: 'a'.repeat(12 * 1024) };

      const response = await request(app)
        .post('/api/v1')
        .send(largePayload);

      expect(response.status).toBe(413);
      expect(response.body).toEqual({
        success: false,
        message: 'Request payload exceeds the 10kb limit',
        code: 'PAYLOAD_TOO_LARGE',
      });
    });
  });

  describe('Zod Validation Middleware', () => {
    const testApp = express();
    testApp.use(express.json());

    const testSchema = {
      body: z.object({
        email: z.string().email('Invalid email format'),
        age: z.number().min(18, 'Must be at least 18'),
      }),
    };

    testApp.post(
      '/test-validation',
      validate(testSchema),
      (req: Request, res: Response) => {
        sendSuccess(res, req.body, 'Validation succeeded');
      }
    );
    testApp.use(errorHandler);

    it('should pass validation with valid data', async () => {
      const validData = { email: 'user@example.com', age: 25 };
      const response = await request(testApp)
        .post('/test-validation')
        .send(validData);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Validation succeeded',
        data: validData,
      });
    });

    it('should return 400 with VALIDATION_ERROR and field details on invalid data', async () => {
      const invalidData = { email: 'not-an-email', age: 16 };
      const response = await request(testApp)
        .post('/test-validation')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('VALIDATION_ERROR');
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'email', message: 'Invalid email format' }),
          expect.objectContaining({ field: 'age', message: 'Must be at least 18' }),
        ])
      );
    });
  });

  describe('CORS Restrictions', () => {
    it('should block unauthorized origins', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://unauthorized-malicious-site.com');

      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        success: false,
        message: "Origin 'http://unauthorized-malicious-site.com' not allowed by CORS policy",
        code: 'CORS_NOT_ALLOWED',
      });
    });
  });

  describe('Rate Limiter', () => {
    it('should block requests exceeding the configured limit with 429', async () => {
      const testLimiterApp = express();
      const { createRateLimiter } = await import('../src/middleware/rateLimiter');

      const strictLimiter = createRateLimiter({
        windowMs: 60 * 1000,
        max: 2,
        message: 'Strict rate limit reached',
        code: 'STRICT_RATE_LIMIT',
      });

      testLimiterApp.use(strictLimiter);
      testLimiterApp.get('/test-limit', (_req: Request, res: Response) => {
        sendSuccess(res, { ok: true });
      });

      // Request 1: OK
      const res1 = await request(testLimiterApp).get('/test-limit');
      expect(res1.status).toBe(200);

      // Request 2: OK
      const res2 = await request(testLimiterApp).get('/test-limit');
      expect(res2.status).toBe(200);

      // Request 3: Exceeded limit (429)
      const res3 = await request(testLimiterApp).get('/test-limit');
      expect(res3.status).toBe(429);
      expect(res3.body).toEqual({
        success: false,
        message: 'Strict rate limit reached',
        code: 'STRICT_RATE_LIMIT',
      });
    });
  });

  describe('Production Error Masking', () => {
    it('should mask internal errors and stack traces in production mode', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      vi.resetModules();

      try {
        const { errorHandler: prodErrorHandler } = await import('../src/middleware/errorHandler');

        const testProdApp = express();
        testProdApp.get('/internal-crash', () => {
          throw new Error('Database password was password123 at /secret/path.ts');
        });
        testProdApp.use(prodErrorHandler);

        const response = await request(testProdApp).get('/internal-crash');
        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
        expect(response.body.code).toBe('INTERNAL_SERVER_ERROR');
        expect(response.body.message).toBe('Something went wrong');
        // Verify no stack trace or internal path is exposed in response body
        expect(response.body.stack).toBeUndefined();
        expect(JSON.stringify(response.body)).not.toContain('/secret/path.ts');
        expect(JSON.stringify(response.body)).not.toContain('password123');
      } finally {
        process.env.NODE_ENV = originalNodeEnv;
        vi.resetModules();
      }
    });
  });

});

