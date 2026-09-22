import { Router } from 'express';
import { competitionController } from '../controllers/competition.controller';
import { optionalAuthenticate } from '../middleware/optionalAuthenticate';
import registrationRouter from './registration.routes';
import submissionRouter from './submission.routes';

const competitionRouter = Router();

// Registration routes: POST /:competitionId/register
competitionRouter.use('/', registrationRouter);

// Submission routes: POST /:competitionId/submission
competitionRouter.use('/', submissionRouter);

// GET /api/v1/competitions/:competitionId
competitionRouter.get(
  '/:competitionId',
  optionalAuthenticate,
  competitionController.getDetails
);

export default competitionRouter;
