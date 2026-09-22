import { Router } from 'express';
import { competitionController } from '../controllers/competition.controller';
import { optionalAuthenticate } from '../middleware/optionalAuthenticate';
import registrationRouter from './registration.routes';

const competitionRouter = Router();

// Registration routes: POST /:competitionId/register
competitionRouter.use('/', registrationRouter);

// GET /api/v1/competitions/:competitionId
competitionRouter.get(
  '/:competitionId',
  optionalAuthenticate,
  competitionController.getDetails
);

export default competitionRouter;
