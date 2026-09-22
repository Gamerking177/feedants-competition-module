import { Router } from 'express';
import { sendSuccess } from '../utils/response';

import authRouter from './auth.routes';
import competitionRouter from './competition.routes';

const apiV1Router = Router();

/**
 * Root /api/v1 index route
 */
apiV1Router.get('/', (_req, res) => {
  sendSuccess(
    res,
    {
      version: 'v1',
      status: 'active',
    },
    'Feedants Competition API v1'
  );
});

// Authentication & User Management
apiV1Router.use('/auth', authRouter);

// Competition Module
apiV1Router.use('/competitions', competitionRouter);

// Placeholders for future endpoints:
// apiV1Router.use('/registrations', registrationRouter);
// apiV1Router.use('/submissions', submissionRouter);

export default apiV1Router;
