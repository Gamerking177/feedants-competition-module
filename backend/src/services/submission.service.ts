import mongoose from 'mongoose';
import { Competition } from '../models/Competition';
import { Registration } from '../models/Registration';
import { Submission, SubmissionStatus } from '../models/Submission';
import { competitionService } from './competition.service';
import { AppError } from '../utils/AppError';
import { CreateSubmissionInput } from '../validators/submission.validator';

export interface SubmissionResult {
  id: string;
  competitionId: string;
  userId: string;
  fileUrl: string;
  fileType: string;
  status: SubmissionStatus;
  submittedAt: Date;
}

interface MongoDuplicateKeyError extends Error {
  code?: number;
  keyPattern?: Record<string, number>;
}

export const submissionService = {
  /**
   * Creates a submission for an authenticated registered user in an active competition.
   * Enforces server-authoritative lifecycle, registration prerequisite, and duplicate protection.
   */
  async createSubmission(
    competitionId: string,
    userId: string,
    input: CreateSubmissionInput
  ): Promise<SubmissionResult> {
    // 1. Strict 24-character hexadecimal ObjectId format validation
    if (!mongoose.isObjectIdOrHexString(competitionId)) {
      throw AppError.badRequest('Invalid competition ID format', 'INVALID_ID');
    }

    if (!mongoose.isObjectIdOrHexString(userId)) {
      throw AppError.badRequest('Invalid user ID format', 'INVALID_ID');
    }

    // 2. Fetch competition
    const competition = await Competition.findById(competitionId);
    if (!competition) {
      throw AppError.notFound('Competition not found', 'COMPETITION_NOT_FOUND');
    }

    // 3. Single server-authoritative timestamp for lifecycle validation and record creation
    const now = new Date();
    const effectiveStatus = competitionService.determineCompetitionStatus(competition, now);

    if (effectiveStatus !== 'SUBMISSION_OPEN') {
      throw AppError.conflict(
        'Submissions are not currently open for this competition',
        'SUBMISSION_NOT_OPEN'
      );
    }

    // 4. Verify user registration
    const isRegistered = await Registration.exists({
      competitionId: competition._id,
      userId,
    });

    if (!isRegistered) {
      throw AppError.conflict(
        'You must be registered for this competition to submit',
        'NOT_REGISTERED'
      );
    }

    // 5. Early duplicate submission check
    const existingSubmission = await Submission.exists({
      competitionId: competition._id,
      userId,
    });

    if (existingSubmission) {
      throw AppError.conflict(
        'You have already submitted for this competition',
        'ALREADY_SUBMITTED'
      );
    }

    // 6. Create submission record
    try {
      const submission = await Submission.create({
        competitionId: competition._id,
        userId,
        fileUrl: input.fileUrl,
        fileType: input.fileType,
        status: 'SUBMITTED',
        submittedAt: now,
      });

      return {
        id: submission.id,
        competitionId: submission.competitionId.toString(),
        userId: submission.userId.toString(),
        fileUrl: submission.fileUrl,
        fileType: submission.fileType,
        status: submission.status,
        submittedAt: submission.submittedAt,
      };
    } catch (error: unknown) {
      // Map MongoDB duplicate-key errors for (competitionId, userId) to ALREADY_SUBMITTED
      const mongoError = error as MongoDuplicateKeyError;
      if (
        mongoError.code === 11000 &&
        ((mongoError.keyPattern?.competitionId && mongoError.keyPattern?.userId) ||
          mongoError.message?.includes('competitionId_1_userId_1'))
      ) {
        throw AppError.conflict(
          'You have already submitted for this competition',
          'ALREADY_SUBMITTED'
        );
      }

      throw error;
    }
  },
};
