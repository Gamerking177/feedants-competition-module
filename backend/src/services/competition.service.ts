import mongoose from 'mongoose';
import { Competition, CompetitionStatus, ICompetition } from '../models/Competition';
import { Registration } from '../models/Registration';
import { Submission } from '../models/Submission';
import { AppError } from '../utils/AppError';
import { AuthenticatedUser } from '../types/express';

export interface CompetitionDateInput {
  registrationStart?: Date;
  registrationEnd?: Date;
  submissionStart?: Date;
  submissionEnd?: Date;
  resultDate?: Date;
}

export interface CompetitionDetailsResult {
  competition: Record<string, unknown>;
  userState: {
    isRegistered: boolean;
    hasSubmitted: boolean;
  };
  actions: {
    canRegister: boolean;
    canSubmit: boolean;
  };
}

export type CompetitionStatusInput = Pick<
  ICompetition,
  | 'status'
  | 'registrationStart'
  | 'registrationEnd'
  | 'submissionStart'
  | 'submissionEnd'
  | 'resultDate'
  | 'registeredCount'
  | 'maxParticipants'
>;

export const competitionService = {
  /**
   * Validates the chronological sequence of competition dates.
   * Required order:
   *   registrationStart < registrationEnd <= submissionStart < submissionEnd
   *   and conditionally submissionEnd <= resultDate (when resultDate is present).
   */
  validateCompetitionDates(dates: CompetitionDateInput): boolean {
    const { registrationStart, registrationEnd, submissionStart, submissionEnd, resultDate } = dates;

    if (registrationStart && registrationEnd) {
      if (registrationEnd.getTime() <= registrationStart.getTime()) {
        throw AppError.badRequest(
          'registrationEnd must be after registrationStart',
          'INVALID_DATE_SEQUENCE'
        );
      }
    }

    if (registrationEnd && submissionStart) {
      if (submissionStart.getTime() < registrationEnd.getTime()) {
        throw AppError.badRequest(
          'submissionStart must be on or after registrationEnd',
          'INVALID_DATE_SEQUENCE'
        );
      }
    }

    if (submissionStart && submissionEnd) {
      if (submissionEnd.getTime() <= submissionStart.getTime()) {
        throw AppError.badRequest(
          'submissionEnd must be after submissionStart',
          'INVALID_DATE_SEQUENCE'
        );
      }
    }

    if (submissionEnd && resultDate) {
      if (resultDate.getTime() < submissionEnd.getTime()) {
        throw AppError.badRequest(
          'resultDate must be on or after submissionEnd',
          'INVALID_DATE_SEQUENCE'
        );
      }
    }

    return true;
  },

  /**
   * Calculates remaining participation spots.
   * Guaranteed to never return a negative number.
   */
  getRemainingSpots(maxParticipants: number, registeredCount: number): number {
    return Math.max(0, maxParticipants - registeredCount);
  },

  /**
   * Determines the effective runtime status of a competition based on
   * persisted status, server-side UTC time, lifecycle date windows, and capacity.
   *
   * Business Rules:
   * 1. If persisted status is DRAFT or COMPLETED, the persisted status is authoritative.
   * 2. If now < registrationStart => UPCOMING.
   * 3. If registrationStart <= now < registrationEnd:
   *    - If registeredCount >= maxParticipants => REGISTRATION_CLOSED (capacity full).
   *    - Else => REGISTRATION_OPEN.
   * 4. If registrationEnd <= now < submissionStart => REGISTRATION_CLOSED.
   * 5. If submissionStart <= now < submissionEnd => SUBMISSION_OPEN.
   * 6. If submissionEnd <= now:
   *    - If resultDate exists AND now < resultDate => SUBMISSION_CLOSED.
   *    - If resultDate is undefined => SUBMISSION_CLOSED (remains closed until results published).
   *    - If resultDate exists AND now >= resultDate => RESULT_PUBLISHED.
   *
   * Note: This function derives the effective status dynamically and does NOT
   * mutate the database.
   */
  determineCompetitionStatus(
    competition: CompetitionStatusInput,
    currentDate: Date = new Date()
  ): CompetitionStatus {
    const {
      status: persistedStatus,
      registrationStart,
      registrationEnd,
      submissionStart,
      submissionEnd,
      resultDate,
      registeredCount,
      maxParticipants,
    } = competition;

    // 1. Administrative override states
    if (persistedStatus === 'DRAFT' || persistedStatus === 'COMPLETED') {
      return persistedStatus;
    }

    const now = currentDate.getTime();
    const regStart = new Date(registrationStart).getTime();
    const regEnd = new Date(registrationEnd).getTime();
    const subStart = new Date(submissionStart).getTime();
    const subEnd = new Date(submissionEnd).getTime();
    const resDate = resultDate ? new Date(resultDate).getTime() : undefined;

    // 2. Before registration window
    if (now < regStart) {
      return 'UPCOMING';
    }

    // 3. During registration window
    if (now >= regStart && now < regEnd) {
      if (registeredCount >= maxParticipants) {
        return 'REGISTRATION_CLOSED';
      }
      return 'REGISTRATION_OPEN';
    }

    // 4. After registration window, before submission window
    if (now >= regEnd && now < subStart) {
      return 'REGISTRATION_CLOSED';
    }

    // 5. During submission window
    if (now >= subStart && now < subEnd) {
      return 'SUBMISSION_OPEN';
    }

    // 6. After submission window
    if (now >= subEnd) {
      if (resDate !== undefined && now >= resDate) {
        return 'RESULT_PUBLISHED';
      }
      return 'SUBMISSION_CLOSED';
    }

    return 'UPCOMING';
  },

  /**
   * Retrieves full competition details by ID, computing effective status,
   * remaining spots, user state, and permitted actions.
   */
  async getCompetitionDetails(
    competitionId: string,
    user?: AuthenticatedUser
  ): Promise<CompetitionDetailsResult> {
    // 1. Strict 24-char hex ObjectId validation
    if (!mongoose.isObjectIdOrHexString(competitionId)) {
      throw AppError.badRequest('Invalid competition ID format', 'INVALID_ID');
    }

    // 2. Fetch competition from MongoDB
    const competition = await Competition.findById(competitionId);
    if (!competition) {
      throw AppError.notFound('Competition not found', 'COMPETITION_NOT_FOUND');
    }

    // 3. Single server timestamp for consistent lifecycle evaluation
    const now = new Date();

    // 4. Derive dynamic business state server-side
    const effectiveStatus = this.determineCompetitionStatus(competition, now);
    const remainingSpots = this.getRemainingSpots(
      competition.maxParticipants,
      competition.registeredCount
    );

    // 5. Serialize competition data (strips __v and maps _id to id)
    const competitionJson = competition.toJSON();
    const competitionData = {
      ...competitionJson,
      status: effectiveStatus,
      remainingSpots,
    };

    // 6. Build user participation state
    let isRegistered = false;
    let hasSubmitted = false;

    if (user?.id) {
      const [regExists, subExists] = await Promise.all([
        Registration.exists({
          competitionId: competition._id,
          userId: user.id,
        }),
        Submission.exists({
          competitionId: competition._id,
          userId: user.id,
        }),
      ]);
      isRegistered = Boolean(regExists);
      hasSubmitted = Boolean(subExists);
    }

    const userState = {
      isRegistered,
      hasSubmitted,
    };

    // 7. Build permitted actions
    const actions = {
      canRegister: effectiveStatus === 'REGISTRATION_OPEN' && remainingSpots > 0 && !isRegistered,
      canSubmit: effectiveStatus === 'SUBMISSION_OPEN' && isRegistered && !hasSubmitted,
    };

    return {
      competition: competitionData,
      userState,
      actions,
    };
  },
};
