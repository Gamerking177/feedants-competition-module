import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { Competition, ICompetition, COMPETITION_STATUSES } from '../src/models/Competition';
import { competitionService } from '../src/services/competition.service';
import { env } from '../src/config/env';

describe('Competition Data Model & Lifecycle Tests (34 Scenarios)', () => {
  beforeAll(async () => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Tests cannot run in production environment!');
    }

    const testUri = env.TEST_MONGODB_URI;
    if (!testUri.includes('test')) {
      throw new Error('TEST_MONGODB_URI must point to an isolated test database!');
    }

    await mongoose.connect(testUri);
  });

  afterAll(async () => {
    await Competition.deleteMany({});
    await mongoose.disconnect();
  });

  afterEach(async () => {
    await Competition.deleteMany({});
  });

  // Base valid competition attributes for tests
  const createBaseCompetitionData = (): Partial<ICompetition> => {
    const now = Date.now();
    return {
      title: 'National Coding Challenge 2026',
      slug: 'national-coding-challenge-2026',
      category: 'Coding',
      type: 'Hackathon',
      description: 'The premier national coding competition for students.',
      language: 'English',
      prizePool: 100000,
      entryFee: 0,
      maxParticipants: 500,
      registeredCount: 0,
      certificateAvailable: true,
      registrationStart: new Date(now + 1 * 24 * 60 * 60 * 1000), // +1 day
      registrationEnd: new Date(now + 7 * 24 * 60 * 60 * 1000),   // +7 days
      submissionStart: new Date(now + 8 * 24 * 60 * 60 * 1000),   // +8 days
      submissionEnd: new Date(now + 14 * 24 * 60 * 60 * 1000),   // +14 days
      resultDate: new Date(now + 20 * 24 * 60 * 60 * 1000),      // +20 days
      status: 'UPCOMING',
      judge: {
        name: 'Dr. Sarah Connor',
        designation: 'VP of Engineering',
        organization: 'TechCorp',
      },
      rewards: [
        { position: 1, title: 'Grand Prize', amount: 50000, description: 'Cash prize' },
        { position: 2, title: 'Runner Up', amount: 30000, description: 'Cash prize' },
      ],
      rules: [
        { order: 1, title: 'Original Work', description: 'All submissions must be original.' },
      ],
    };
  };

  // ==========================================
  // 1. MODEL TESTS (1-12)
  // ==========================================
  describe('Model & Schema Constraints', () => {
    it('1. Valid competition can be created', async () => {
      const data = createBaseCompetitionData();
      const comp = await Competition.create(data);

      expect(comp._id).toBeDefined();
      expect(comp.title).toBe(data.title);
      expect(comp.slug).toBe(data.slug);
      expect(comp.prizePool).toBe(100000);
      expect(comp.maxParticipants).toBe(500);
      expect(comp.registeredCount).toBe(0);
      expect(comp.status).toBe('UPCOMING');
    });

    it('2. Required fields are enforced', async () => {
      // Create empty document
      const comp = new Competition({});
      let err: mongoose.Error.ValidationError | null = null;

      try {
        await comp.validate();
      } catch (error) {
        err = error as mongoose.Error.ValidationError;
      }

      expect(err).not.toBeNull();
      expect(err!.errors.title).toBeDefined();
      expect(err!.errors.slug).toBeDefined();
      expect(err!.errors.category).toBeDefined();
      expect(err!.errors.type).toBeDefined();
      expect(err!.errors.description).toBeDefined();
      expect(err!.errors.prizePool).toBeDefined();
      expect(err!.errors.maxParticipants).toBeDefined();
      expect(err!.errors.registrationStart).toBeDefined();
      expect(err!.errors.registrationEnd).toBeDefined();
      expect(err!.errors.submissionStart).toBeDefined();
      expect(err!.errors.submissionEnd).toBeDefined();
    });

    it('3. Invalid status is rejected', async () => {
      const data = createBaseCompetitionData();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data.status = 'INVALID_STATUS' as any;

      await expect(Competition.create(data)).rejects.toThrow(/not a valid competition status/);
    });

    it('4. Negative prizePool is rejected', async () => {
      const data = createBaseCompetitionData();
      data.prizePool = -500;

      await expect(Competition.create(data)).rejects.toThrow(/Prize pool cannot be negative/);
    });

    it('5. Negative entryFee is rejected', async () => {
      const data = createBaseCompetitionData();
      data.entryFee = -100;

      await expect(Competition.create(data)).rejects.toThrow(/Entry fee cannot be negative/);
    });

    it('6. Invalid maxParticipants (< 1) is rejected', async () => {
      const data = createBaseCompetitionData();
      data.maxParticipants = 0;

      await expect(Competition.create(data)).rejects.toThrow(/Max participants must be at least 1/);
    });

    it('7. Invalid registeredCount (< 0) is rejected', async () => {
      const data = createBaseCompetitionData();
      data.registeredCount = -1;

      await expect(Competition.create(data)).rejects.toThrow(/Registered count cannot be negative/);
    });

    it('8. registeredCount cannot exceed maxParticipants', async () => {
      const data = createBaseCompetitionData();
      data.maxParticipants = 100;
      data.registeredCount = 105;

      await expect(Competition.create(data)).rejects.toThrow(/registeredCount cannot exceed maxParticipants/);
    });

    it('9. Slug is unique', async () => {
      const data1 = createBaseCompetitionData();
      data1.slug = 'duplicate-slug-challenge';
      await Competition.create(data1);

      const data2 = createBaseCompetitionData();
      data2.slug = 'duplicate-slug-challenge';

      await expect(Competition.create(data2)).rejects.toThrow();
    });

    it('10. Timestamps are created', async () => {
      const comp = await Competition.create(createBaseCompetitionData());

      expect(comp.createdAt).toBeDefined();
      expect(comp.updatedAt).toBeDefined();
      expect(comp.createdAt instanceof Date).toBe(true);
      expect(comp.updatedAt instanceof Date).toBe(true);
    });

    it('11. Serialization maps _id to id', async () => {
      const comp = await Competition.create(createBaseCompetitionData());
      const json = comp.toJSON();

      expect(json.id).toBeDefined();
      expect(json.id).toBe(comp._id.toString());
      expect(json._id).toBeUndefined();
    });

    it('12. __v is not exposed in serialized JSON', async () => {
      const comp = await Competition.create(createBaseCompetitionData());
      const json = comp.toJSON();

      expect(json.__v).toBeUndefined();
      expect(JSON.stringify(json)).not.toContain('__v');
    });
  });

  // ==========================================
  // 2. DATE RULES (13-16)
  // ==========================================
  describe('Date Chronology Validation', () => {
    it('13. registrationEnd before registrationStart is rejected', async () => {
      const data = createBaseCompetitionData();
      data.registrationStart = new Date('2026-05-10T00:00:00Z');
      data.registrationEnd = new Date('2026-05-05T00:00:00Z'); // Invalid: before start

      await expect(Competition.create(data)).rejects.toThrow(/registrationEnd must be after registrationStart/);
    });

    it('14. submissionEnd before submissionStart is rejected', async () => {
      const data = createBaseCompetitionData();
      data.submissionStart = new Date('2026-06-15T00:00:00Z');
      data.submissionEnd = new Date('2026-06-10T00:00:00Z'); // Invalid: before start

      await expect(Competition.create(data)).rejects.toThrow(/submissionEnd must be after submissionStart/);
    });

    it('15. submissionStart before registrationEnd is rejected', async () => {
      const data = createBaseCompetitionData();
      data.registrationStart = new Date('2026-05-01T00:00:00Z');
      data.registrationEnd = new Date('2026-05-15T00:00:00Z');
      data.submissionStart = new Date('2026-05-10T00:00:00Z'); // Invalid: before registrationEnd

      await expect(Competition.create(data)).rejects.toThrow(/submissionStart must be on or after registrationEnd/);
    });

    it('16. resultDate before submissionEnd is rejected', async () => {
      const data = createBaseCompetitionData();
      data.submissionEnd = new Date('2026-06-20T00:00:00Z');
      data.resultDate = new Date('2026-06-18T00:00:00Z'); // Invalid: before submissionEnd

      await expect(Competition.create(data)).rejects.toThrow(/resultDate must be on or after submissionEnd/);
    });
  });

  // ==========================================
  // 3. PERSISTED LIFECYCLE RECOGNITION (17-24)
  // ==========================================
  describe('Persisted Lifecycle Recognition', () => {
    it.each(COMPETITION_STATUSES)('%s status is recognized and stored in MongoDB', async (status) => {
      const data = createBaseCompetitionData();
      data.slug = `test-status-${status.toLowerCase()}`;
      data.status = status;

      const comp = await Competition.create(data);
      expect(comp.status).toBe(status);

      const found = await Competition.findById(comp.id);
      expect(found!.status).toBe(status);
    });
  });

  // ==========================================
  // 4. TIME-BASED EFFECTIVE STATUS (25-31)
  // ==========================================
  describe('Time-Based Effective Status Determination', () => {
    const baseCompetition: ICompetition = {
      title: 'Lifecycle Test Challenge',
      slug: 'lifecycle-test-challenge',
      category: 'Coding',
      type: 'Hackathon',
      description: 'Testing lifecycle',
      language: 'English',
      prizePool: 10000,
      entryFee: 0,
      maxParticipants: 100,
      registeredCount: 50,
      certificateAvailable: true,
      registrationStart: new Date('2026-06-01T00:00:00Z'),
      registrationEnd: new Date('2026-06-10T00:00:00Z'),
      submissionStart: new Date('2026-06-11T00:00:00Z'),
      submissionEnd: new Date('2026-06-20T00:00:00Z'),
      resultDate: new Date('2026-06-25T00:00:00Z'),
      rewards: [],
      previousWinners: [],
      judgingParameters: [],
      rules: [],
      status: 'UPCOMING',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('25. Competition before registrationStart is UPCOMING', () => {
      const now = new Date('2026-05-15T00:00:00Z');
      const status = competitionService.determineCompetitionStatus(baseCompetition, now);
      expect(status).toBe('UPCOMING');
    });

    it('26. Competition during registration window is REGISTRATION_OPEN', () => {
      const now = new Date('2026-06-05T00:00:00Z');
      const status = competitionService.determineCompetitionStatus(baseCompetition, now);
      expect(status).toBe('REGISTRATION_OPEN');
    });

    it('27. Competition during registration window but capacity full is REGISTRATION_CLOSED', () => {
      const fullCompetition = {
        ...baseCompetition,
        maxParticipants: 100,
        registeredCount: 100, // Full
      };
      const now = new Date('2026-06-05T00:00:00Z');
      const status = competitionService.determineCompetitionStatus(fullCompetition, now);
      expect(status).toBe('REGISTRATION_CLOSED');
    });

    it('28. Competition after registrationEnd and before submissionStart is REGISTRATION_CLOSED', () => {
      const now = new Date('2026-06-10T12:00:00Z');
      const status = competitionService.determineCompetitionStatus(baseCompetition, now);
      expect(status).toBe('REGISTRATION_CLOSED');
    });

    it('29. Competition during submission window is SUBMISSION_OPEN', () => {
      const now = new Date('2026-06-15T00:00:00Z');
      const status = competitionService.determineCompetitionStatus(baseCompetition, now);
      expect(status).toBe('SUBMISSION_OPEN');
    });

    it('30. Competition after submissionEnd and before resultDate is SUBMISSION_CLOSED', () => {
      const now = new Date('2026-06-22T00:00:00Z');
      const status = competitionService.determineCompetitionStatus(baseCompetition, now);
      expect(status).toBe('SUBMISSION_CLOSED');
    });

    it('31. Competition after resultDate is RESULT_PUBLISHED', () => {
      const now = new Date('2026-06-26T00:00:00Z');
      const status = competitionService.determineCompetitionStatus(baseCompetition, now);
      expect(status).toBe('RESULT_PUBLISHED');
    });
  });

  // ==========================================
  // 5. CAPACITY TESTS (32-33)
  // ==========================================
  describe('Capacity & Remaining Spots Calculation', () => {
    it('32. Remaining spots are calculated correctly', () => {
      const remaining = competitionService.getRemainingSpots(500, 150);
      expect(remaining).toBe(350);

      const remainingZero = competitionService.getRemainingSpots(100, 100);
      expect(remainingZero).toBe(0);
    });

    it('33. Remaining spots never returns a negative number', () => {
      // Bad legacy data where registered exceeds max
      const remaining = competitionService.getRemainingSpots(100, 150);
      expect(remaining).toBe(0);
      expect(remaining).toBeGreaterThanOrEqual(0);
    });
  });

  // ==========================================
  // 6. OPTIONAL resultDate LIFECYCLE (34)
  // ==========================================
  describe('Optional resultDate Lifecycle', () => {
    it('34. Competition after submissionEnd with no resultDate remains SUBMISSION_CLOSED', () => {
      const noResultDateCompetition: ICompetition = {
        title: 'No Result Date Challenge',
        slug: 'no-result-date-challenge',
        category: 'Coding',
        type: 'Hackathon',
        description: 'Result date not yet decided',
        language: 'English',
        prizePool: 10000,
        entryFee: 0,
        maxParticipants: 100,
        registeredCount: 20,
        certificateAvailable: false,
        registrationStart: new Date('2026-06-01T00:00:00Z'),
        registrationEnd: new Date('2026-06-10T00:00:00Z'),
        submissionStart: new Date('2026-06-11T00:00:00Z'),
        submissionEnd: new Date('2026-06-20T00:00:00Z'),
        resultDate: undefined, // Optional result date
        rewards: [],
        previousWinners: [],
        judgingParameters: [],
        rules: [],
        status: 'UPCOMING',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 5 days after submissionEnd
      const now = new Date('2026-06-25T00:00:00Z');
      const status = competitionService.determineCompetitionStatus(noResultDateCompetition, now);

      // Must remain SUBMISSION_CLOSED since resultDate is undefined
      expect(status).toBe('SUBMISSION_CLOSED');
    });
  });
});
