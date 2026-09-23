import { ApiSuccessResponse } from '../../services/api/types';

/**
 * Valid competition lifecycle statuses as defined by the backend.
 */
export type CompetitionStatus =
  | 'DRAFT'
  | 'UPCOMING'
  | 'REGISTRATION_OPEN'
  | 'REGISTRATION_CLOSED'
  | 'SUBMISSION_OPEN'
  | 'SUBMISSION_CLOSED'
  | 'RESULT_PUBLISHED'
  | 'COMPLETED';

/**
 * Judge profile subdocument.
 */
export interface Judge {
  name: string;
  designation?: string;
  organization?: string;
  avatarUrl?: string;
  videoUrl?: string;
}

/**
 * Competition reward subdocument.
 */
export interface Reward {
  position: number;
  title: string;
  amount?: number;
  description?: string;
}

/**
 * Previous winner subdocument.
 */
export interface PreviousWinner {
  name: string;
  position: number;
  year?: number;
  imageUrl?: string;
}

/**
 * Judging parameter subdocument.
 */
export interface JudgingParameter {
  name: string;
  description?: string;
  weight?: number;
}

/**
 * Competition rule subdocument.
 */
export interface Rule {
  order: number;
  title?: string;
  description: string;
}

/**
 * Full Competition entity matching the backend serialized model.
 */
export interface Competition {
  id: string;
  title: string;
  slug: string;
  category: string;
  type: string;
  description: string;
  language: string;
  prizePool: number;
  entryFee: number;
  maxParticipants: number;
  registeredCount: number;
  remainingSpots: number;
  certificateAvailable: boolean;
  registrationStart: string;
  registrationEnd: string;
  submissionStart: string;
  submissionEnd: string;
  resultDate?: string;
  judge?: Judge;
  rewards: Reward[];
  previousWinners: PreviousWinner[];
  judgingParameters: JudgingParameter[];
  rules: Rule[];
  status: CompetitionStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Dynamic user participation state for a competition.
 */
export interface UserState {
  isRegistered: boolean;
  hasSubmitted: boolean;
}

/**
 * Dynamic permitted actions for the current user and competition state.
 */
export interface CompetitionActions {
  canRegister: boolean;
  canSubmit: boolean;
}

/**
 * Inner data payload returned by GET /api/v1/competitions/:competitionId.
 */
export interface CompetitionDetailsData {
  competition: Competition;
  userState: UserState;
  actions: CompetitionActions;
}

/**
 * Complete API response envelope for competition details.
 */
export type CompetitionDetailsResponse = ApiSuccessResponse<CompetitionDetailsData>;
