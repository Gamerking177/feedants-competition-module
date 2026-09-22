import { Router } from 'express';
import { competitionController } from '../controllers/competition.controller';
import { optionalAuthenticate } from '../middleware/optionalAuthenticate';

const competitionRouter = Router();

// GET /api/v1/competitions/:competitionId
competitionRouter.get(
  '/:competitionId',
  optionalAuthenticate,
  competitionController.getDetails
);

export default competitionRouter;
