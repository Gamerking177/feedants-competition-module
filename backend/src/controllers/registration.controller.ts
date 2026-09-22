import { Request, Response, NextFunction } from 'express';
import { registrationService } from '../services/registration.service';
import { sendSuccess } from '../utils/response';
import { AppError } from '../utils/AppError';

export const registrationController = {
  /**
   * Handles POST /api/v1/competitions/:competitionId/register
   * Registers the authenticated user for the competition.
   */
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { competitionId } = req.params;

      if (!req.user || !req.user.id) {
        throw AppError.unauthorized('Authentication required', 'UNAUTHORIZED');
      }

      // Authenticated user identity comes strictly from verified JWT
      const userId = req.user.id;

      const registration = await registrationService.registerUserForCompetition(
        competitionId,
        userId
      );

      sendSuccess(
        res,
        { registration },
        'Competition registration successful',
        201
      );
    } catch (error) {
      next(error);
    }
  },
};
