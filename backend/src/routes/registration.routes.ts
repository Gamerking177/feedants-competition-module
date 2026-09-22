import { Router } from 'express';
import { registrationController } from '../controllers/registration.controller';
import { authenticate } from '../middleware/authenticate';
import { createRateLimiter } from '../middleware/rateLimiter';
import { env } from '../config/env';

const registrationRouter = Router();

const isTestEnv = env.NODE_ENV === 'test';

// Registration rate limiter: 30 requests per 15 min in production, relaxed in test environment
const registrationRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: isTestEnv ? 1000 : 30,
  message: 'Too many registration attempts from this IP. Please try again later.',
  code: 'REGISTRATION_RATE_LIMIT_EXCEEDED',
});

// POST /api/v1/competitions/:competitionId/register
registrationRouter.post(
  '/:competitionId/register',
  authenticate,
  registrationRateLimiter,
  registrationController.register
);

export default registrationRouter;
