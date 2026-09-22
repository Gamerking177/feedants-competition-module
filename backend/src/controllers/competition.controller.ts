import { Request, Response, NextFunction } from 'express';
import { competitionService } from '../services/competition.service';
import { sendSuccess } from '../utils/response';

export const competitionController = {
  /**
   * Handles GET /api/v1/competitions/:competitionId
   * Returns competition details, dynamic user participation state, and permitted actions.
   */
  async getDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { competitionId } = req.params;
      const data = await competitionService.getCompetitionDetails(competitionId, req.user);

      sendSuccess(res, data, 'Competition details retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  },
};
