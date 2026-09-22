import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import { User } from '../src/models/User';
import { env } from '../src/config/env';

describe('Authentication & User Management Tests (20 Scenarios)', () => {
  beforeAll(async () => {
    // Ensure test environment is strictly isolated and cannot target production
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Tests cannot run in production environment!');
    }

    const testUri = env.TEST_MONGODB_URI;
    if (!testUri.includes('test')) {
      throw new Error('TEST_MONGODB_URI must point to an isolated test database!');
    }

    await mongoose.connect(testUri);
  });

  afterAll(async () => {
    // Clean up test database and disconnect cleanly
    await User.deleteMany({});
    await mongoose.disconnect();
  });

  afterEach(async () => {
    // Clean up collections between tests for deterministic state
    await User.deleteMany({});
  });

  // ==========================================
  // REGISTRATION TESTS
  // ==========================================
  describe('POST /api/v1/auth/register', () => {
    it('1. Successful registration: creates user and returns 201 with safe user and JWT', async () => {
      const payload = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'SecurePassword123',
      };

      const res = await request(app).post('/api/v1/auth/register').send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Registration successful');
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.id).toBeDefined();
      expect(res.body.data.user.name).toBe('Jane Doe');
      expect(res.body.data.user.email).toBe('jane@example.com');
      expect(res.body.data.user.role).toBe('user');
      expect(res.body.data.token).toBeDefined();

      // Verify user exists in database
      const dbUser = await User.findOne({ email: 'jane@example.com' });
      expect(dbUser).not.toBeNull();
      expect(dbUser!.name).toBe('Jane Doe');
    });

    it('2. Missing name: returns 400 with VALIDATION_ERROR', async () => {
      const payload = {
        email: 'noname@example.com',
        password: 'SecurePassword123',
      };

      const res = await request(app).post('/api/v1/auth/register').send(payload);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(res.body.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'name' })])
      );
    });

    it('3. Invalid email: returns 400 with VALIDATION_ERROR', async () => {
      const payload = {
        name: 'John Doe',
        email: 'invalid-email-format',
        password: 'SecurePassword123',
      };

      const res = await request(app).post('/api/v1/auth/register').send(payload);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(res.body.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'email' })])
      );
    });

    it('4. Weak password (<8 characters): returns 400 with VALIDATION_ERROR', async () => {
      const payload = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'short',
      };

      const res = await request(app).post('/api/v1/auth/register').send(payload);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(res.body.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'password' })])
      );
    });

    it('5. Duplicate email: returns 409 with EMAIL_ALREADY_EXISTS', async () => {
      const payload = {
        name: 'Original User',
        email: 'duplicate@example.com',
        password: 'Password123',
      };

      // First registration succeeds
      const firstRes = await request(app).post('/api/v1/auth/register').send(payload);
      expect(firstRes.status).toBe(201);

      // Second registration with same email (even with different case/spaces)
      const duplicateRes = await request(app).post('/api/v1/auth/register').send({
        name: 'Duplicate Attempt',
        email: '  DUPLICATE@example.com ',
        password: 'Password456',
      });

      expect(duplicateRes.status).toBe(409);
      expect(duplicateRes.body.success).toBe(false);
      expect(duplicateRes.body.code).toBe('EMAIL_ALREADY_EXISTS');
      expect(duplicateRes.body.message).toBe('Email already registered');
    });

    it('6. Password security: password and passwordHash are NEVER returned in response', async () => {
      const payload = {
        name: 'Secret User',
        email: 'secret@example.com',
        password: 'SuperSecretPassword123',
      };

      const res = await request(app).post('/api/v1/auth/register').send(payload);

      expect(res.status).toBe(201);
      expect(res.body.data.user.password).toBeUndefined();
      expect(res.body.data.user.passwordHash).toBeUndefined();
      expect(JSON.stringify(res.body)).not.toContain('SuperSecretPassword123');
      expect(JSON.stringify(res.body)).not.toContain('passwordHash');
    });

    it('7. Password hashing: password is properly hashed with bcrypt in database', async () => {
      const rawPassword = 'MySecretPlaintextPassword123';
      const payload = {
        name: 'Hash Test',
        email: 'hash@example.com',
        password: rawPassword,
      };

      await request(app).post('/api/v1/auth/register').send(payload);

      const dbUser = await User.findOne({ email: 'hash@example.com' }).select('+passwordHash');
      expect(dbUser).not.toBeNull();
      expect(dbUser!.passwordHash).toBeDefined();
      expect(dbUser!.passwordHash).not.toBe(rawPassword);
      // Verify bcrypt hash structure ($2a$ or $2b$)
      expect(dbUser!.passwordHash).toMatch(/^\$2[ab]\$\d+\$/);
      // Verify bcrypt can compare the hash
      const isMatch = await bcrypt.compare(rawPassword, dbUser!.passwordHash);
      expect(isMatch).toBe(true);
    });
  });

  // ==========================================
  // LOGIN TESTS
  // ==========================================
  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      // Seed a test user
      const passwordHash = await bcrypt.hash('CorrectPassword123', 10);
      await User.create({
        name: 'Login Tester',
        email: 'tester@example.com',
        passwordHash,
        role: 'user',
        isActive: true,
      });
    });

    it('8. Successful login: returns 200 with safe user and JWT', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'tester@example.com',
        password: 'CorrectPassword123',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Login successful');
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe('tester@example.com');
      expect(res.body.data.token).toBeDefined();
    });

    it('9. Wrong password: returns 401 with generic INVALID_CREDENTIALS', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'tester@example.com',
        password: 'WrongPassword456',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('INVALID_CREDENTIALS');
      expect(res.body.message).toBe('Invalid email or password');
    });

    it('10. Unknown email: returns 401 with generic INVALID_CREDENTIALS (no account leakage)', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'nonexistent@example.com',
        password: 'AnyPassword123',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('INVALID_CREDENTIALS');
      expect(res.body.message).toBe('Invalid email or password');
    });

    it('11. Missing login fields: returns 400 with VALIDATION_ERROR', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'tester@example.com',
        // password omitted
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('12. JWT validation: returned JWT has valid structure and verifiable HS256 signature', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'tester@example.com',
        password: 'CorrectPassword123',
      });

      const token = res.body.data.token;
      expect(token).toBeDefined();

      const decoded = jwt.verify(token, env.JWT_SECRET, {
        algorithms: ['HS256'],
      }) as { sub: string; role: string };

      expect(decoded.sub).toBeDefined();
      expect(decoded.role).toBe('user');
    });

    it('13. Password security on login: password and passwordHash are NEVER returned', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'tester@example.com',
        password: 'CorrectPassword123',
      });

      expect(res.status).toBe(200);
      expect(res.body.data.user.password).toBeUndefined();
      expect(res.body.data.user.passwordHash).toBeUndefined();
      expect(JSON.stringify(res.body)).not.toContain('passwordHash');
      expect(JSON.stringify(res.body)).not.toContain('CorrectPassword123');
    });
  });

  // ==========================================
  // AUTHENTICATION & /auth/me TESTS
  // ==========================================
  describe('GET /api/v1/auth/me', () => {
    let testUserToken: string;
    let testUserId: string;

    beforeEach(async () => {
      const passwordHash = await bcrypt.hash('Password123', 10);
      const user = await User.create({
        name: 'Auth Me Tester',
        email: 'authme@example.com',
        passwordHash,
        role: 'user',
        isActive: true,
      });
      testUserId = user.id;

      testUserToken = jwt.sign(
        { sub: user.id, role: user.role },
        env.JWT_SECRET,
        { expiresIn: '1h', algorithm: 'HS256' }
      );
    });

    it('14. /auth/me with valid JWT: returns 200 with user profile', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${testUserToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('User retrieved successfully');
      expect(res.body.data.user.id).toBe(testUserId);
      expect(res.body.data.user.name).toBe('Auth Me Tester');
      expect(res.body.data.user.email).toBe('authme@example.com');
      expect(res.body.data.user.role).toBe('user');
      expect(res.body.data.user.passwordHash).toBeUndefined();
    });

    it('15. /auth/me without Authorization header: returns 401 UNAUTHORIZED', async () => {
      const res = await request(app).get('/api/v1/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('UNAUTHORIZED');
      expect(res.body.message).toBe('Authentication token is missing');
    });

    it('16. /auth/me with malformed Authorization header: returns 401 UNAUTHORIZED', async () => {
      // Test missing "Bearer " prefix
      const res1 = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Basic sometoken');

      expect(res1.status).toBe(401);
      expect(res1.body.code).toBe('UNAUTHORIZED');

      // Test "Bearer " with empty token
      const res2 = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer ');

      expect(res2.status).toBe(401);
      expect(res2.body.code).toBe('UNAUTHORIZED');
    });

    it('17. /auth/me with invalid/tampered token: returns 401 INVALID_TOKEN', async () => {
      const tamperedToken = testUserToken.slice(0, -5) + 'abcde';

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${tamperedToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('INVALID_TOKEN');
      expect(res.body.message).toBe('Invalid authentication token');
    });

    it('18. /auth/me with expired token: returns 401 TOKEN_EXPIRED', async () => {
      // Create an already expired token
      const expiredToken = jwt.sign(
        { sub: testUserId, role: 'user' },
        env.JWT_SECRET,
        { expiresIn: '-1s', algorithm: 'HS256' }
      );

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('TOKEN_EXPIRED');
      expect(res.body.message).toBe('Token has expired');
    });

    it('19. /auth/me when user was deleted from database: returns 401 USER_NOT_FOUND', async () => {
      // Delete the user from database
      await User.findByIdAndDelete(testUserId);

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${testUserToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('USER_NOT_FOUND');
      expect(res.body.message).toBe('Authenticated user not found');
    });

    it('20. /auth/me for inactive user (isActive: false): returns 401 ACCOUNT_INACTIVE', async () => {
      // Deactivate user in database
      await User.findByIdAndUpdate(testUserId, { isActive: false });

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${testUserToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('ACCOUNT_INACTIVE');
      expect(res.body.message).toBe('Account is deactivated');
    });
  });
});
