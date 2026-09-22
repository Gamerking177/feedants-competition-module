import { Router } from 'express';
import { env } from '../config/env';
import { authController } from '../controllers/auth.controller';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/authenticate';
import { createRateLimiter } from '../middleware/rateLimiter';
import { registerSchema, loginSchema } from '../validators/auth.validator';

const authRouter = Router();

const isTestEnv = env.NODE_ENV === 'test' || process.env.NODE_ENV === 'test';

// Stricter rate limiter for sensitive authentication endpoints (10 requests per 15 min in production)
const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: isTestEnv ? 1000 : 10,
  message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
  code: 'AUTH_RATE_LIMIT_EXCEEDED',
});

// POST /api/v1/auth/register
authRouter.post(
  '/register',
  authRateLimiter,
  validate({ body: registerSchema }),
  authController.register
);

// POST /api/v1/auth/login
authRouter.post(
  '/login',
  authRateLimiter,
  validate({ body: loginSchema }),
  authController.login
);

// GET /api/v1/auth/me
authRouter.get(
  '/me',
  authenticate,
  authController.getMe
);

export default authRouter;
