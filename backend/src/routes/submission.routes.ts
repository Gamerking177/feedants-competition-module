import { Router } from 'express';
import { submissionController } from '../controllers/submission.controller';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { createRateLimiter } from '../middleware/rateLimiter';
import { createSubmissionSchema } from '../validators/submission.validator';
import { env } from '../config/env';

const submissionRouter = Router();

const isTestEnv = env.NODE_ENV === 'test';

// Submission rate limiter: 30 requests per 15 min in production, relaxed in test environment
const submissionRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: isTestEnv ? 1000 : 30,
  message: 'Too many submission attempts from this IP. Please try again later.',
  code: 'SUBMISSION_RATE_LIMIT_EXCEEDED',
});

// POST /api/v1/competitions/:competitionId/submission
submissionRouter.post(
  '/:competitionId/submission',
  authenticate,
  submissionRateLimiter,
  validate({ body: createSubmissionSchema }),
  submissionController.submit
);

export default submissionRouter;
