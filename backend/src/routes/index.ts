import { Router } from 'express';
import { sendSuccess } from '../utils/response';

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

// Placeholders for future Phase endpoints:
// apiV1Router.use('/auth', authRouter);
// apiV1Router.use('/competitions', competitionRouter);
// apiV1Router.use('/registrations', registrationRouter);
// apiV1Router.use('/submissions', submissionRouter);

export default apiV1Router;
