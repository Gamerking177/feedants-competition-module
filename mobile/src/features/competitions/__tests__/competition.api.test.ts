import { describe, expect, it } from 'vitest';
import { buildCompetitionDetailsPath } from '../competition.api';

describe('Competition API (competition.api.ts)', () => {
  describe('buildCompetitionDetailsPath', () => {
    it('should construct correct endpoint path for standard ObjectId', () => {
      const competitionId = '60c72b2f9b1d8b001c8e4e01';
      const path = buildCompetitionDetailsPath(competitionId);
      expect(path).toBe('/api/v1/competitions/60c72b2f9b1d8b001c8e4e01');
    });

    it('should trim surrounding whitespace from competitionId', () => {
      const competitionId = '  60c72b2f9b1d8b001c8e4e01  ';
      const path = buildCompetitionDetailsPath(competitionId);
      expect(path).toBe('/api/v1/competitions/60c72b2f9b1d8b001c8e4e01');
    });

    it('should URL-encode special characters in competitionId', () => {
      const competitionId = 'comp/123';
      const path = buildCompetitionDetailsPath(competitionId);
      expect(path).toBe('/api/v1/competitions/comp%2F123');
    });

    it('should throw an error when competitionId is empty', () => {
      expect(() => buildCompetitionDetailsPath('')).toThrow('competitionId is required');
      expect(() => buildCompetitionDetailsPath('   ')).toThrow('competitionId is required');
    });
  });
});
