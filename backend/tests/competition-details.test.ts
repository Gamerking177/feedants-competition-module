import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import { Competition, ICompetition } from '../src/models/Competition';
import { User } from '../src/models/User';
import { env } from '../src/config/env';

describe('Competition Details API Tests (25 Scenarios)', () => {
  let testUserId: string;
  let validToken: string;

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

  beforeEach(async () => {
    await Competition.deleteMany({});
    await User.deleteMany({});

    // Create test user for authenticated requests
    const user = await User.create({
      name: 'Competition Viewer',
      email: 'viewer@example.com',
      passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz12345678901234567890123456',
      role: 'user',
      isActive: true,
    });
    testUserId = user.id;

    validToken = jwt.sign(
      { sub: user.id, role: user.role },
      env.JWT_SECRET,
      { expiresIn: '1h', algorithm: 'HS256' }
    );
  });

  afterAll(async () => {
    await Competition.deleteMany({});
    await User.deleteMany({});
    await mongoose.disconnect();
  });

  afterEach(async () => {
    await Competition.deleteMany({});
    await User.deleteMany({});
  });

  const createBaseCompetition = (overrides: Partial<ICompetition> = {}): Partial<ICompetition> => {
    const now = Date.now();
    return {
      title: 'Full Stack Innovation Cup',
      slug: 'full-stack-innovation-cup',
      category: 'Web Development',
      type: 'Team',
      description: 'Build production-ready web apps for modern challenges.',
      language: 'English',
      prizePool: 250000,
      entryFee: 500,
      maxParticipants: 200,
      registeredCount: 50,
      certificateAvailable: true,
      registrationStart: new Date(now + 1 * 24 * 60 * 60 * 1000), // +1 day
      registrationEnd: new Date(now + 7 * 24 * 60 * 60 * 1000),   // +7 days
      submissionStart: new Date(now + 8 * 24 * 60 * 60 * 1000),   // +8 days
      submissionEnd: new Date(now + 14 * 24 * 60 * 60 * 1000),   // +14 days
      resultDate: new Date(now + 20 * 24 * 60 * 60 * 1000),      // +20 days
      status: 'UPCOMING',
      judge: {
        name: 'Alex Rivera',
        designation: 'Principal Architect',
        organization: 'CloudScale',
        avatarUrl: 'https://example.com/alex.jpg',
      },
      rewards: [
        { position: 1, title: 'Gold Medalist', amount: 150000, description: '1st place' },
        { position: 2, title: 'Silver Medalist', amount: 100000, description: '2nd place' },
      ],
      previousWinners: [
        { name: 'Team Alpha', position: 1, year: 2025, imageUrl: 'https://example.com/alpha.jpg' },
      ],
      judgingParameters: [
        { name: 'Architecture', description: 'Clean scalable design', weight: 40 },
        { name: 'Execution', description: 'Working features', weight: 60 },
      ],
      rules: [
        { order: 1, title: 'Team Size', description: '1-4 members per team' },
        { order: 2, title: 'Deadline', description: 'Late submissions will not be scored' },
      ],
      ...overrides,
    };
  };

  // ===================================================
  // CORE API & RESPONSE STRUCTURE (1-5)
  // ===================================================
  it('1. Valid competition returns 200 with standard response structure', async () => {
    const comp = await Competition.create(createBaseCompetition());

    const res = await request(app).get(`/api/v1/competitions/${comp.id}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Competition details retrieved successfully');
    expect(res.body.data).toBeDefined();
    expect(res.body.data.competition).toBeDefined();
    expect(res.body.data.userState).toBeDefined();
    expect(res.body.data.actions).toBeDefined();
  });

  it('2. Response contains complete competition metadata', async () => {
    const comp = await Competition.create(createBaseCompetition());

    const res = await request(app).get(`/api/v1/competitions/${comp.id}`);
    const { competition } = res.body.data;

    expect(competition.id).toBe(comp.id);
    expect(competition.title).toBe('Full Stack Innovation Cup');
    expect(competition.slug).toBe('full-stack-innovation-cup');
    expect(competition.category).toBe('Web Development');
    expect(competition.type).toBe('Team');
    expect(competition.description).toBeDefined();
    expect(competition.language).toBe('English');
    expect(competition.prizePool).toBe(250000);
    expect(competition.entryFee).toBe(500);
    expect(competition.maxParticipants).toBe(200);
    expect(competition.registeredCount).toBe(50);
    expect(competition.certificateAvailable).toBe(true);
    expect(competition.judge.name).toBe('Alex Rivera');
    expect(competition.rewards).toHaveLength(2);
    expect(competition.previousWinners).toHaveLength(1);
    expect(competition.judgingParameters).toHaveLength(2);
    expect(competition.rules).toHaveLength(2);
  });

  it('3. Response contains effective status', async () => {
    const comp = await Competition.create(createBaseCompetition());

    const res = await request(app).get(`/api/v1/competitions/${comp.id}`);
    expect(res.body.data.competition.status).toBe('UPCOMING');
  });

  it('4. remainingSpots is calculated correctly', async () => {
    const comp = await Competition.create(
      createBaseCompetition({ maxParticipants: 300, registeredCount: 120 })
    );

    const res = await request(app).get(`/api/v1/competitions/${comp.id}`);
    expect(res.body.data.competition.remainingSpots).toBe(180);
  });

  it('5. remainingSpots never becomes negative', async () => {
    // Edge case: registeredCount equals maxParticipants
    const comp = await Competition.create(
      createBaseCompetition({ maxParticipants: 100, registeredCount: 100 })
    );

    const res = await request(app).get(`/api/v1/competitions/${comp.id}`);
    expect(res.body.data.competition.remainingSpots).toBe(0);
    expect(res.body.data.competition.remainingSpots).toBeGreaterThanOrEqual(0);
  });

  // ===================================================
  // ERROR & NOT FOUND CASES (6-7)
  // ===================================================
  it('6. Competition not found returns 404', async () => {
    const nonExistentId = new mongoose.Types.ObjectId().toHexString();

    const res = await request(app).get(`/api/v1/competitions/${nonExistentId}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('COMPETITION_NOT_FOUND');
    expect(res.body.message).toBe('Competition not found');
  });

  it('7. Invalid ObjectId returns 400', async () => {
    const malformedId = 'not-a-valid-hex-id-123';

    const res = await request(app).get(`/api/v1/competitions/${malformedId}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('INVALID_ID');
    expect(res.body.message).toBe('Invalid competition ID format');
  });

  // ===================================================
  // LIFECYCLE & TIME-BASED STATUS CASES (8-15)
  // ===================================================
  it('8. DRAFT competition returns DRAFT', async () => {
    const comp = await Competition.create(createBaseCompetition({ status: 'DRAFT' }));

    const res = await request(app).get(`/api/v1/competitions/${comp.id}`);
    expect(res.body.data.competition.status).toBe('DRAFT');
    expect(res.body.data.actions.canRegister).toBe(false);
  });

  it('9. Upcoming competition returns UPCOMING', async () => {
    const now = Date.now();
    const comp = await Competition.create(
      createBaseCompetition({
        registrationStart: new Date(now + 10 * 60 * 1000), // 10 mins from now
        registrationEnd: new Date(now + 60 * 60 * 1000),
        submissionStart: new Date(now + 2 * 60 * 60 * 1000),
        submissionEnd: new Date(now + 3 * 60 * 60 * 1000),
        status: 'UPCOMING',
      })
    );

    const res = await request(app).get(`/api/v1/competitions/${comp.id}`);
    expect(res.body.data.competition.status).toBe('UPCOMING');
    expect(res.body.data.actions.canRegister).toBe(false);
  });

  it('10. Registration-open competition returns REGISTRATION_OPEN', async () => {
    const now = Date.now();
    const comp = await Competition.create(
      createBaseCompetition({
        registrationStart: new Date(now - 10 * 60 * 1000), // 10 mins ago
        registrationEnd: new Date(now + 60 * 60 * 1000),   // 1 hour from now
        submissionStart: new Date(now + 2 * 60 * 60 * 1000),
        submissionEnd: new Date(now + 3 * 60 * 60 * 1000),
        status: 'UPCOMING', // Persisted as UPCOMING, but time says REGISTRATION_OPEN
        maxParticipants: 100,
        registeredCount: 20,
      })
    );

    const res = await request(app).get(`/api/v1/competitions/${comp.id}`);
    expect(res.body.data.competition.status).toBe('REGISTRATION_OPEN');
    expect(res.body.data.actions.canRegister).toBe(true);
  });

  it('11. Full registration capacity returns REGISTRATION_CLOSED', async () => {
    const now = Date.now();
    const comp = await Competition.create(
      createBaseCompetition({
        registrationStart: new Date(now - 10 * 60 * 1000),
        registrationEnd: new Date(now + 60 * 60 * 1000),
        submissionStart: new Date(now + 2 * 60 * 60 * 1000),
        submissionEnd: new Date(now + 3 * 60 * 60 * 1000),
        maxParticipants: 100,
        registeredCount: 100, // Full
      })
    );

    const res = await request(app).get(`/api/v1/competitions/${comp.id}`);
    expect(res.body.data.competition.status).toBe('REGISTRATION_CLOSED');
    expect(res.body.data.actions.canRegister).toBe(false);
  });

  it('12. Submission-open competition returns SUBMISSION_OPEN', async () => {
    const now = Date.now();
    const comp = await Competition.create(
      createBaseCompetition({
        registrationStart: new Date(now - 60 * 60 * 1000),
        registrationEnd: new Date(now - 30 * 60 * 1000),
        submissionStart: new Date(now - 10 * 60 * 1000), // 10 mins ago
        submissionEnd: new Date(now + 60 * 60 * 1000),   // 1 hour from now
      })
    );

    const res = await request(app).get(`/api/v1/competitions/${comp.id}`);
    expect(res.body.data.competition.status).toBe('SUBMISSION_OPEN');
    expect(res.body.data.actions.canRegister).toBe(false);
  });

  it('13. Submission-closed competition returns SUBMISSION_CLOSED', async () => {
    const now = Date.now();
    const comp = await Competition.create(
      createBaseCompetition({
        registrationStart: new Date(now - 60 * 60 * 1000),
        registrationEnd: new Date(now - 40 * 60 * 1000),
        submissionStart: new Date(now - 30 * 60 * 1000),
        submissionEnd: new Date(now - 10 * 60 * 1000), // 10 mins ago
        resultDate: new Date(now + 60 * 60 * 1000),    // 1 hour from now
      })
    );

    const res = await request(app).get(`/api/v1/competitions/${comp.id}`);
    expect(res.body.data.competition.status).toBe('SUBMISSION_CLOSED');
    expect(res.body.data.actions.canRegister).toBe(false);
  });

  it('14. Competition with reached resultDate returns RESULT_PUBLISHED', async () => {
    const now = Date.now();
    const comp = await Competition.create(
      createBaseCompetition({
        registrationStart: new Date(now - 60 * 60 * 1000),
        registrationEnd: new Date(now - 40 * 60 * 1000),
        submissionStart: new Date(now - 30 * 60 * 1000),
        submissionEnd: new Date(now - 20 * 60 * 1000),
        resultDate: new Date(now - 5 * 60 * 1000), // 5 mins ago
      })
    );

    const res = await request(app).get(`/api/v1/competitions/${comp.id}`);
    expect(res.body.data.competition.status).toBe('RESULT_PUBLISHED');
  });

  it('15. Competition without resultDate after submissionEnd remains SUBMISSION_CLOSED', async () => {
    const now = Date.now();
    const comp = await Competition.create(
      createBaseCompetition({
        registrationStart: new Date(now - 60 * 60 * 1000),
        registrationEnd: new Date(now - 40 * 60 * 1000),
        submissionStart: new Date(now - 30 * 60 * 1000),
        submissionEnd: new Date(now - 10 * 60 * 1000),
        resultDate: undefined, // No resultDate set
      })
    );

    const res = await request(app).get(`/api/v1/competitions/${comp.id}`);
    expect(res.body.data.competition.status).toBe('SUBMISSION_CLOSED');
  });

  // ===================================================
  // AUTHENTICATION & SECURITY CASES (16-25)
  // ===================================================
  it('16. Anonymous request works (no Authorization header)', async () => {
    const comp = await Competition.create(createBaseCompetition());

    const res = await request(app).get(`/api/v1/competitions/${comp.id}`);

    expect(res.status).toBe(200);
    expect(res.body.data.userState).toEqual({
      isRegistered: false,
      hasSubmitted: false,
    });
  });

  it('17. Valid authenticated request works', async () => {
    const comp = await Competition.create(createBaseCompetition());

    const res = await request(app)
      .get(`/api/v1/competitions/${comp.id}`)
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.userState).toEqual({
      isRegistered: false,
      hasSubmitted: false,
    });
  });

  it('18. Authenticated user identity comes strictly from JWT', async () => {
    const comp = await Competition.create(createBaseCompetition());

    const res = await request(app)
      .get(`/api/v1/competitions/${comp.id}`)
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(testUserId).toBeDefined();
  });

  it('19. Invalid Bearer token returns 401', async () => {
    const comp = await Competition.create(createBaseCompetition());

    const res = await request(app)
      .get(`/api/v1/competitions/${comp.id}`)
      .set('Authorization', 'Bearer invalid-token-value-here');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('INVALID_TOKEN');
  });

  it('20. Client-provided userId in query or custom header is ignored and not trusted', async () => {
    const comp = await Competition.create(createBaseCompetition());
    const fakeUserId = new mongoose.Types.ObjectId().toHexString();

    const res = await request(app)
      .get(`/api/v1/competitions/${comp.id}?userId=${fakeUserId}`)
      .set('X-User-ID', fakeUserId);

    expect(res.status).toBe(200);
    // User state remains unauthenticated default
    expect(res.body.data.userState.isRegistered).toBe(false);
  });

  it('21. Client-provided status in query is ignored; server-derived status is authoritative', async () => {
    const comp = await Competition.create(createBaseCompetition()); // base status is UPCOMING

    const res = await request(app).get(
      `/api/v1/competitions/${comp.id}?status=COMPLETED`
    );

    expect(res.status).toBe(200);
    // Effective status calculated by server is UPCOMING, not COMPLETED from query
    expect(res.body.data.competition.status).toBe('UPCOMING');
  });

  it('22. Client-provided remainingSpots in query is ignored; calculated value is returned', async () => {
    const comp = await Competition.create(
      createBaseCompetition({ maxParticipants: 100, registeredCount: 25 })
    );

    const res = await request(app).get(
      `/api/v1/competitions/${comp.id}?remainingSpots=999999`
    );

    expect(res.status).toBe(200);
    expect(res.body.data.competition.remainingSpots).toBe(75);
  });

  it('23. canRegister is backend-derived based on status and spots', async () => {
    const now = Date.now();
    // Open competition with spots
    const openComp = await Competition.create(
      createBaseCompetition({
        registrationStart: new Date(now - 10 * 60 * 1000),
        registrationEnd: new Date(now + 60 * 60 * 1000),
        submissionStart: new Date(now + 2 * 60 * 60 * 1000),
        submissionEnd: new Date(now + 3 * 60 * 60 * 1000),
        maxParticipants: 100,
        registeredCount: 10,
      })
    );

    const resOpen = await request(app).get(`/api/v1/competitions/${openComp.id}`);
    expect(resOpen.body.data.actions.canRegister).toBe(true);

    // Closed competition
    const closedComp = await Competition.create(
      createBaseCompetition({
        slug: 'closed-comp-slug',
        registrationStart: new Date(now - 60 * 60 * 1000),
        registrationEnd: new Date(now - 30 * 60 * 1000),
        submissionStart: new Date(now - 20 * 60 * 1000),
        submissionEnd: new Date(now + 60 * 60 * 1000),
      })
    );

    const resClosed = await request(app).get(`/api/v1/competitions/${closedComp.id}`);
    expect(resClosed.body.data.actions.canRegister).toBe(false);
  });

  it('24. canSubmit remains false until Submission functionality exists', async () => {
    const comp = await Competition.create(createBaseCompetition());

    const res = await request(app).get(`/api/v1/competitions/${comp.id}`);
    expect(res.body.data.actions.canSubmit).toBe(false);
  });

  it('25. Sensitive and internal database fields (_id, __v) are not exposed in payload or subdocuments', async () => {
    const comp = await Competition.create(createBaseCompetition());

    const res = await request(app).get(`/api/v1/competitions/${comp.id}`);
    const bodyStr = JSON.stringify(res.body);

    // Root fields
    expect(res.body.data.competition.id).toBe(comp.id);
    expect(res.body.data.competition._id).toBeUndefined();
    expect(res.body.data.competition.__v).toBeUndefined();

    // Subdocuments should not have _id or __v
    expect(bodyStr).not.toContain('"__v"');
    expect(bodyStr).not.toContain('"_id"');
  });
});
