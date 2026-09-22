import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app';

describe('GET /health', () => {
  it('should return 200 with healthy status and timestamp', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: 'Request successful',
      data: {
        status: 'Healthy',
        timestamp: expect.any(String),
      },
    });

    // Check that timestamp is valid ISO string
    expect(new Date(response.body.data.timestamp).toISOString()).toBe(
      response.body.data.timestamp
    );

    // Check that X-Request-ID header is present
    expect(response.headers['x-request-id']).toBeDefined();
    expect(response.headers['x-request-id']).toMatch(/^req_/);
  });

  it('should preserve incoming X-Request-ID header', async () => {
    const customRequestId = 'test-request-id-12345';
    const response = await request(app)
      .get('/health')
      .set('X-Request-ID', customRequestId);

    expect(response.status).toBe(200);
    expect(response.headers['x-request-id']).toBe(customRequestId);
  });
});
