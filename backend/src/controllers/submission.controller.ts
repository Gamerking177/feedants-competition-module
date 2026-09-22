import { Request, Response, NextFunction } from 'express';
import { submissionService } from '../services/submission.service';
import { sendSuccess } from '../utils/response';
import { AppError } from '../utils/AppError';

export const submissionController = {
  /**
   * Handles POST /api/v1/competitions/:competitionId/submission
   * Submits a project entry for the authenticated registered user.
   */
  async submit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { competitionId } = req.params;

      if (!req.user || !req.user.id) {
        throw AppError.unauthorized('Authentication required', 'UNAUTHORIZED');
      }

      const userId = req.user.id;
      const { fileUrl, fileType } = req.body;

      const submission = await submissionService.createSubmission(
        competitionId,
        userId,
        { fileUrl, fileType }
      );

      sendSuccess(
        res,
        { submission },
        'Submission received successfully',
        201
      );
    } catch (error) {
      next(error);
    }
  },
};
