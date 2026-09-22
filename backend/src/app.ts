import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import cors, { CorsOptions } from 'cors';
import { env } from './config/env';
import { requestIdMiddleware } from './utils/requestId';
import { requestLogger } from './utils/logger';
import { globalRateLimiter } from './middleware/rateLimiter';
import { notFoundHandler } from './middleware/notFound';
import { errorHandler } from './middleware/errorHandler';
import { sendSuccess } from './utils/response';
import { AppError } from './utils/AppError';
import apiV1Router from './routes';

const app: Application = express();

// 1. Trust proxy (for accurate client IP when behind reverse proxy/load balancer)
app.set('trust proxy', 1);

// 2. Security headers
app.use(helmet());

// 3. Centralized CORS configuration
const allowedOrigins = env.CORS_ORIGIN.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (mobile apps, curl, server-to-server) without Origin header
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }

    return callback(
      new AppError(`Origin '${origin}' not allowed by CORS policy`, 403, 'CORS_NOT_ALLOWED')
    );
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
};

app.use(cors(corsOptions));

// 4. Request ID tagging (before logging and rate limiting)
app.use(requestIdMiddleware);

// 5. Structured HTTP Request Logging
app.use(requestLogger);

// 6. JSON & URL-encoded body parsing with strict size limits
// NOTE: 10kb limit is enforced for normal JSON APIs. Future competition submission file uploads
// will NOT use this JSON body parser; they will use streaming or direct object-storage uploads.
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// 7. Global API Rate Limiting
app.use(globalRateLimiter);

// 8. Health Check Endpoint (unauthenticated, lightweight)
app.get('/health', (_req: Request, res: Response) => {
  sendSuccess(res, {
    status: 'Healthy',
    timestamp: new Date().toISOString(),
  });
});

// 9. Versioned API Routes
app.use('/api/v1', apiV1Router);

// 10. 404 Handler for undefined routes
app.use(notFoundHandler);

// 11. Centralized Error Handler
app.use(errorHandler);

export default app;
