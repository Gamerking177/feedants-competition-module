import { apiClient } from '../../services/api/client';
import { CompetitionDetailsData } from './competition.types';

/**
 * Helper to build the competition details endpoint path.
 */
export function buildCompetitionDetailsPath(competitionId: string): string {
  const trimmedId = competitionId.trim();
  if (!trimmedId) {
    throw new Error('competitionId is required');
  }
  return `/api/v1/competitions/${encodeURIComponent(trimmedId)}`;
}

/**
 * Competition API Service.
 * Interfaces with competition endpoints using the centralized API client.
 */
export const competitionApi = {
  /**
   * Retrieves full details, user participation state, and permitted actions for a competition.
   * GET /api/v1/competitions/:competitionId
   *
   * @param competitionId - 24-character hexadecimal MongoDB ObjectId
   * @returns Typed CompetitionDetailsData
   */
  async getCompetitionDetails(competitionId: string): Promise<CompetitionDetailsData> {
    const path = buildCompetitionDetailsPath(competitionId);
    return apiClient.get<CompetitionDetailsData>(path);
  },
};
