import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import app from '../src/app';
import { Competition, ICompetition } from '../src/models/Competition';
import { User, IUserDocument } from '../src/models/User';
import { Registration } from '../src/models/Registration';
import { env } from '../src/config/env';

describe('Competition Registration Tests (32 Scenarios)', () => {
  let defaultUser: IUserDocument;
  let defaultToken: string;
  let replSet: MongoMemoryReplSet;

  beforeAll(async () => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Tests cannot run in production environment!');
    }

    // Start in-memory replica set for full MongoDB transaction support in tests
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const testUri = replSet.getUri();

    await mongoose.connect(testUri);
    await Registration.createIndexes();
    await Competition.createIndexes();
    await User.createIndexes();
  });

  beforeEach(async () => {
    await Registration.deleteMany({});
    await Competition.deleteMany({});
    await User.deleteMany({});

    defaultUser = await User.create({
      name: 'Test Competitor',
      email: `competitor_${Date.now()}_${Math.random()}@example.com`,
      passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz12345678901234567890123456',
      role: 'user',
      isActive: true,
    });

    defaultToken = jwt.sign(
      { sub: defaultUser.id, role: defaultUser.role },
      env.JWT_SECRET,
      { expiresIn: '1h', algorithm: 'HS256' }
    );
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await Registration.deleteMany({});
    await Competition.deleteMany({});
    await User.deleteMany({});
  });

  afterAll(async () => {
    await Registration.deleteMany({});
    await Competition.deleteMany({});
    await User.deleteMany({});
    await mongoose.disconnect();
    if (replSet) {
      await replSet.stop();
    }
  });

  const createBaseCompetition = (overrides: Partial<ICompetition> = {}): Partial<ICompetition> => {
    const now = Date.now();
    return {
      title: 'Global CodeSprint 2026',
      slug: `global-codesprint-${now}-${Math.floor(Math.random() * 10000)}`,
      category: 'Software Engineering',
      type: 'Individual',
      description: 'Annual competitive engineering challenge.',
      language: 'English',
      prizePool: 500000,
      entryFee: 0, // Free competition by default
      maxParticipants: 100,
      registeredCount: 0,
      certificateAvailable: true,
      registrationStart: new Date(now - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      registrationEnd: new Date(now + 5 * 24 * 60 * 60 * 1000),   // in 5 days
      submissionStart: new Date(now + 6 * 24 * 60 * 60 * 1000),  // in 6 days
      submissionEnd: new Date(now + 12 * 24 * 60 * 60 * 1000),   // in 12 days
      resultDate: new Date(now + 18 * 24 * 60 * 60 * 1000),      // in 18 days
      status: 'REGISTRATION_OPEN',
      rewards: [
        { position: 1, title: 'Champion', amount: 300000 },
        { position: 2, title: 'Runner-up', amount: 200000 },
      ],
      rules: [
        { order: 1, description: 'Original work only' },
      ],
      ...overrides,
    };
  };

  const createAdditionalUser = async (index: number): Promise<{ user: IUserDocument; token: string }> => {
    const user = await User.create({
      name: `User ${index}`,
      email: `user_${index}_${Date.now()}_${Math.random()}@example.com`,
      passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz12345678901234567890123456',
      role: 'user',
      isActive: true,
    });

    const token = jwt.sign(
      { sub: user.id, role: user.role },
      env.JWT_SECRET,
      { expiresIn: '1h', algorithm: 'HS256' }
    );

    return { user, token };
  };

  // ===================================================
  // BASIC REGISTRATION (1-6)
  // ===================================================
  describe('Basic Registration (1-6)', () => {
    it('1. Authenticated user can register for free competition', async () => {
      const comp = await Competition.create(createBaseCompetition());

      const res = await request(app)
        .post(`/api/v1/competitions/${comp.id}/register`)
        .set('Authorization', `Bearer ${defaultToken}`);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('2. Registration returns HTTP 201 with standardized response structure', async () => {
      const comp = await Competition.create(createBaseCompetition());

      const res = await request(app)
        .post(`/api/v1/competitions/${comp.id}/register`)
        .set('Authorization', `Bearer ${defaultToken}`);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Competition registration successful');
      expect(res.body.data).toHaveProperty('registration');
      expect(res.body.data.registration.id).toBeDefined();
      expect(res.body.data.registration.competitionId).toBe(comp.id);
      expect(res.body.data.registration.userId).toBe(defaultUser.id);
    });

    it('3. Registration document is created in database', async () => {
      const comp = await Competition.create(createBaseCompetition());

      await request(app)
        .post(`/api/v1/competitions/${comp.id}/register`)
        .set('Authorization', `Bearer ${defaultToken}`);

      const registration = await Registration.findOne({
        competitionId: comp._id,
        userId: defaultUser._id,
      });

      expect(registration).not.toBeNull();
      expect(registration?.competitionId.toString()).toBe(comp.id);
      expect(registration?.userId.toString()).toBe(defaultUser.id);
    });

    it('4. Competition registeredCount increments by exactly 1', async () => {
      const comp = await Competition.create(createBaseCompetition({ registeredCount: 5 }));

      await request(app)
        .post(`/api/v1/competitions/${comp.id}/register`)
        .set('Authorization', `Bearer ${defaultToken}`);

      const updatedComp = await Competition.findById(comp.id);
      expect(updatedComp?.registeredCount).toBe(6);
    });

    it('5. Registration status is REGISTERED', async () => {
      const comp = await Competition.create(createBaseCompetition());

      const res = await request(app)
        .post(`/api/v1/competitions/${comp.id}/register`)
        .set('Authorization', `Bearer ${defaultToken}`);

      expect(res.body.data.registration.status).toBe('REGISTERED');

      const registration = await Registration.findOne({
        competitionId: comp._id,
        userId: defaultUser._id,
      });
      expect(registration?.status).toBe('REGISTERED');
    });

    it('6. Payment status is NOT_REQUIRED for free competition', async () => {
      const comp = await Competition.create(createBaseCompetition());

      const res = await request(app)
        .post(`/api/v1/competitions/${comp.id}/register`)
        .set('Authorization', `Bearer ${defaultToken}`);

      expect(res.body.data.registration.paymentStatus).toBe('NOT_REQUIRED');

      const registration = await Registration.findOne({
        competitionId: comp._id,
        userId: defaultUser._id,
      });
      expect(registration?.paymentStatus).toBe('NOT_REQUIRED');
    });
  });

  // ===================================================
  // AUTHENTICATION & SECURITY (7-10)
  // ===================================================
  describe('Authentication & Security (7-10)', () => {
    it('7. Missing JWT returns 401 UNAUTHORIZED', async () => {
      const comp = await Competition.create(createBaseCompetition());

      const res = await request(app)
        .post(`/api/v1/competitions/${comp.id}/register`);

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('8. Invalid JWT returns 401 INVALID_TOKEN', async () => {
      const comp = await Competition.create(createBaseCompetition());

      const res = await request(app)
        .post(`/api/v1/competitions/${comp.id}/register`)
        .set('Authorization', 'Bearer invalid.token.value');

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('INVALID_TOKEN');
    });

    it('9. User identity comes strictly from JWT', async () => {
      const comp = await Competition.create(createBaseCompetition());

      const res = await request(app)
        .post(`/api/v1/competitions/${comp.id}/register`)
        .set('Authorization', `Bearer ${defaultToken}`);

      expect(res.status).toBe(201);
      expect(res.body.data.registration.userId).toBe(defaultUser.id);
    });

    it('10. Client-provided userId in body/query is ignored and cannot change registration ownership', async () => {
      const comp = await Competition.create(createBaseCompetition());
      const spoofedUserId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .post(`/api/v1/competitions/${comp.id}/register?userId=${spoofedUserId}`)
        .set('Authorization', `Bearer ${defaultToken}`)
        .set('X-User-ID', spoofedUserId)
        .send({ userId: spoofedUserId, status: 'VIP', entryFee: 0 });

      expect(res.status).toBe(201);
      expect(res.body.data.registration.userId).toBe(defaultUser.id);
      expect(res.body.data.registration.userId).not.toBe(spoofedUserId);

      // Verify DB record belongs to defaultUser, not spoofedUserId
      const spoofedReg = await Registration.findOne({ userId: spoofedUserId });
      expect(spoofedReg).toBeNull();

      const realReg = await Registration.findOne({ userId: defaultUser.id });
      expect(realReg).not.toBeNull();
    });
  });

  // ===================================================
  // COMPETITION VALIDATION (11-16)
  // ===================================================
  describe('Competition Validation (11-16)', () => {
    it('11. Invalid competition ID format returns 400 INVALID_ID', async () => {
      const res = await request(app)
        .post('/api/v1/competitions/invalid-id-format/register')
        .set('Authorization', `Bearer ${defaultToken}`);

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_ID');
    });

    it('12. Unknown competition returns 404 COMPETITION_NOT_FOUND', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .post(`/api/v1/competitions/${nonExistentId}/register`)
        .set('Authorization', `Bearer ${defaultToken}`);

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('COMPETITION_NOT_FOUND');
    });

    it('13. Registration before registrationStart is rejected with 409 REGISTRATION_CLOSED', async () => {
      const now = Date.now();
      const comp = await Competition.create(
        createBaseCompetition({
          registrationStart: new Date(now + 2 * 24 * 60 * 60 * 1000), // in 2 days
          registrationEnd: new Date(now + 8 * 24 * 60 * 60 * 1000),   // in 8 days
          submissionStart: new Date(now + 9 * 24 * 60 * 60 * 1000),  // in 9 days
          submissionEnd: new Date(now + 15 * 24 * 60 * 60 * 1000),   // in 15 days
          resultDate: new Date(now + 20 * 24 * 60 * 60 * 1000),      // in 20 days
          status: 'UPCOMING',
        })
      );

      const res = await request(app)
        .post(`/api/v1/competitions/${comp.id}/register`)
        .set('Authorization', `Bearer ${defaultToken}`);

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('REGISTRATION_CLOSED');
    });

    it('14. Registration after registrationEnd is rejected with 409 REGISTRATION_CLOSED', async () => {
      const now = Date.now();
      const comp = await Competition.create(
        createBaseCompetition({
          registrationStart: new Date(now - 10 * 24 * 60 * 60 * 1000), // 10 days ago
          registrationEnd: new Date(now - 1 * 24 * 60 * 60 * 1000),   // 1 day ago
          submissionStart: new Date(now + 1 * 24 * 60 * 60 * 1000),
          status: 'REGISTRATION_CLOSED',
        })
      );

      const res = await request(app)
        .post(`/api/v1/competitions/${comp.id}/register`)
        .set('Authorization', `Bearer ${defaultToken}`);

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('REGISTRATION_CLOSED');
    });

    it('15. Full competition rejects registration with 409 REGISTRATION_FULL', async () => {
      const comp = await Competition.create(
        createBaseCompetition({
          maxParticipants: 50,
          registeredCount: 50,
        })
      );

      const res = await request(app)
        .post(`/api/v1/competitions/${comp.id}/register`)
        .set('Authorization', `Bearer ${defaultToken}`);

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('REGISTRATION_FULL');
    });

    it('16. Registration cannot exceed maxParticipants', async () => {
      const comp = await Competition.create(
        createBaseCompetition({
          maxParticipants: 20,
          registeredCount: 20,
        })
      );

      await request(app)
        .post(`/api/v1/competitions/${comp.id}/register`)
        .set('Authorization', `Bearer ${defaultToken}`);

      const updatedComp = await Competition.findById(comp.id);
      expect(updatedComp?.registeredCount).toBe(20);
      expect(updatedComp?.registeredCount).toBeLessThanOrEqual(updatedComp?.maxParticipants || 0);
    });
  });

  // ===================================================
  // DUPLICATE PROTECTION (17-19)
  // ===================================================
  describe('Duplicate Protection (17-19)', () => {
    it('17. Same user cannot register twice', async () => {
      const comp = await Competition.create(createBaseCompetition());

      // First registration succeeds
      const res1 = await request(app)
        .post(`/api/v1/competitions/${comp.id}/register`)
        .set('Authorization', `Bearer ${defaultToken}`);
      expect(res1.status).toBe(201);

      // Second registration rejected
      const res2 = await request(app)
        .post(`/api/v1/competitions/${comp.id}/register`)
        .set('Authorization', `Bearer ${defaultToken}`);
      expect(res2.status).toBe(409);
      expect(res2.body.code).toBe('ALREADY_REGISTERED');
    });

    it('18. Duplicate registration returns ALREADY_REGISTERED', async () => {
      const comp = await Competition.create(createBaseCompetition());

      await request(app)
        .post(`/api/v1/competitions/${comp.id}/register`)
        .set('Authorization', `Bearer ${defaultToken}`);

      const res = await request(app)
        .post(`/api/v1/competitions/${comp.id}/register`)
        .set('Authorization', `Bearer ${defaultToken}`);

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('ALREADY_REGISTERED');
    });

    it('19. Unique compound index exists in MongoDB and enforces duplicate protection', async () => {
      const indexes = await Registration.collection.indexes();
      const compoundIndex = indexes.find(
        (idx) => idx.key?.competitionId === 1 && idx.key?.userId === 1 && idx.unique === true
      );
      expect(compoundIndex).toBeDefined();

      // Verify that direct insertion of duplicate violates index
      const comp = await Competition.create(createBaseCompetition());
      await Registration.create({
        competitionId: comp._id,
        userId: defaultUser._id,
        status: 'REGISTERED',
        paymentStatus: 'NOT_REQUIRED',
        registeredAt: new Date(),
      });

      let duplicateError: unknown;
      try {
        await Registration.create({
          competitionId: comp._id,
          userId: defaultUser._id,
          status: 'REGISTERED',
          paymentStatus: 'NOT_REQUIRED',
          registeredAt: new Date(),
        });
      } catch (err) {
        duplicateError = err;
      }

      expect(duplicateError).toBeDefined();
      expect((duplicateError as { code?: number }).code).toBe(11000);
    });
  });

  // ===================================================
  // PAYMENT HANDLING (20-21)
  // ===================================================
  describe('Payment Handling (20-21)', () => {
    it('20. Free competition registers successfully', async () => {
      const comp = await Competition.create(createBaseCompetition({ entryFee: 0 }));

      const res = await request(app)
        .post(`/api/v1/competitions/${comp.id}/register`)
        .set('Authorization', `Bearer ${defaultToken}`);

      expect(res.status).toBe(201);
      expect(res.body.data.registration.paymentStatus).toBe('NOT_REQUIRED');
    });

    it('21. Paid competition does not create a registered record without payment and returns 409 PAYMENT_REQUIRED', async () => {
      const comp = await Competition.create(createBaseCompetition({ entryFee: 499 }));

      const res = await request(app)
        .post(`/api/v1/competitions/${comp.id}/register`)
        .set('Authorization', `Bearer ${defaultToken}`);

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('PAYMENT_REQUIRED');

      // Verify no registration created
      const reg = await Registration.findOne({ competitionId: comp.id });
      expect(reg).toBeNull();

      // Verify registeredCount untouched
      const updatedComp = await Competition.findById(comp.id);
      expect(updatedComp?.registeredCount).toBe(0);
    });
  });

  // ===================================================
  // TRANSACTION & CONSISTENCY (22-24)
  // ===================================================
  describe('Transaction & Consistency (22-24)', () => {
    it('22. Registration creation failure rolls back capacity increment', async () => {
      const comp = await Competition.create(createBaseCompetition({ registeredCount: 10 }));

      // Mock Registration.create to simulate unexpected database failure during transaction
      vi.spyOn(Registration, 'create').mockRejectedValueOnce(
        new Error('Simulated database error during registration creation')
      );

      const res = await request(app)
        .post(`/api/v1/competitions/${comp.id}/register`)
        .set('Authorization', `Bearer ${defaultToken}`);

      expect(res.status).toBe(500);

      // Verify transaction rollback: registeredCount MUST remain 10
      const updatedComp = await Competition.findById(comp.id);
      expect(updatedComp?.registeredCount).toBe(10);

      // Verify no registration document was persisted
      const reg = await Registration.findOne({ competitionId: comp.id, userId: defaultUser.id });
      expect(reg).toBeNull();
    });

    it('23. Capacity reservation failure does not create Registration', async () => {
      const comp = await Competition.create(
        createBaseCompetition({
          maxParticipants: 5,
          registeredCount: 5, // Already at capacity
        })
      );

      const res = await request(app)
        .post(`/api/v1/competitions/${comp.id}/register`)
        .set('Authorization', `Bearer ${defaultToken}`);

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('REGISTRATION_FULL');

      // Registration document was NOT created
      const reg = await Registration.findOne({ competitionId: comp.id, userId: defaultUser.id });
      expect(reg).toBeNull();
    });

    it('24. Failed registration does not change registeredCount', async () => {
      const comp = await Competition.create(createBaseCompetition({ registeredCount: 15 }));

      // Send request with invalid competition ID
      await request(app)
        .post('/api/v1/competitions/invalid-id-here/register')
        .set('Authorization', `Bearer ${defaultToken}`);

      const updatedComp = await Competition.findById(comp.id);
      expect(updatedComp?.registeredCount).toBe(15);
    });
  });

  // ===================================================
  // CONCURRENCY & RACE CONDITIONS (25-27)
  // ===================================================
  describe('Concurrency & Race Conditions (25-27)', () => {
    it('25. Two different users competing for the final slot: exactly 1 succeeds, 1 rejected, registeredCount increments by 1', async () => {
      const comp = await Competition.create(
        createBaseCompetition({
          maxParticipants: 1,
          registeredCount: 0,
        })
      );

      const userA = await createAdditionalUser(101);
      const userB = await createAdditionalUser(102);

      // Fire both registration requests simultaneously
      const [resA, resB] = await Promise.all([
        request(app)
          .post(`/api/v1/competitions/${comp.id}/register`)
          .set('Authorization', `Bearer ${userA.token}`),
        request(app)
          .post(`/api/v1/competitions/${comp.id}/register`)
          .set('Authorization', `Bearer ${userB.token}`),
      ]);

      const statuses = [resA.status, resB.status];
      expect(statuses).toContain(201);
      expect(statuses).toContain(409);

      const conflictRes = resA.status === 409 ? resA : resB;
      expect(conflictRes.body.code).toBe('REGISTRATION_FULL');

      // Database state verification
      const updatedComp = await Competition.findById(comp.id);
      expect(updatedComp?.registeredCount).toBe(1);

      const registrations = await Registration.find({ competitionId: comp.id });
      expect(registrations).toHaveLength(1);
    });

    it('26. Same user making concurrent registration attempts: exactly 1 Registration, exactly 1 registeredCount increment', async () => {
      const comp = await Competition.create(
        createBaseCompetition({
          maxParticipants: 10,
          registeredCount: 0,
        })
      );

      // Send 5 concurrent registration requests for the same user
      const requests = Array.from({ length: 5 }, () =>
        request(app)
          .post(`/api/v1/competitions/${comp.id}/register`)
          .set('Authorization', `Bearer ${defaultToken}`)
      );

      const responses = await Promise.all(requests);

      const successResponses = responses.filter((r) => r.status === 201);
      const conflictResponses = responses.filter((r) => r.status === 409);

      expect(successResponses).toHaveLength(1);
      expect(conflictResponses).toHaveLength(4);

      for (const res of conflictResponses) {
        expect(res.body.code).toBe('ALREADY_REGISTERED');
      }

      // Database verification
      const updatedComp = await Competition.findById(comp.id);
      expect(updatedComp?.registeredCount).toBe(1);

      const userRegistrations = await Registration.find({
        competitionId: comp.id,
        userId: defaultUser.id,
      });
      expect(userRegistrations).toHaveLength(1);
    });

    it('27. High-concurrency registration attempts: 10 concurrent users for 3 remaining spots never exceed maxParticipants', async () => {
      const comp = await Competition.create(
        createBaseCompetition({
          maxParticipants: 10,
          registeredCount: 7, // 3 spots remaining
        })
      );

      // Create 10 distinct users
      const users = await Promise.all(
        Array.from({ length: 10 }, (_, i) => createAdditionalUser(200 + i))
      );

      // Fire 10 concurrent requests
      const responses = await Promise.all(
        users.map(({ token }) =>
          request(app)
            .post(`/api/v1/competitions/${comp.id}/register`)
            .set('Authorization', `Bearer ${token}`)
        )
      );

      const successes = responses.filter((r) => r.status === 201);
      const failures = responses.filter((r) => r.status === 409);

      expect(successes).toHaveLength(3);
      expect(failures).toHaveLength(7);

      for (const f of failures) {
        expect(f.body.code).toBe('REGISTRATION_FULL');
      }

      // Post-concurrency database verification
      const updatedComp = await Competition.findById(comp.id);
      expect(updatedComp?.registeredCount).toBe(10);
      expect(updatedComp?.registeredCount).toBeLessThanOrEqual(updatedComp?.maxParticipants || 10);

      const totalRegistrations = await Registration.countDocuments({ competitionId: comp.id });
      // Total registrations: 3 new + initial registeredCount
      expect(totalRegistrations).toBe(3);
    });
  });

  // ===================================================
  // COMPETITION DETAILS API INTEGRATION (28-32)
  // ===================================================
  describe('Competition Details API Integration (28-32)', () => {
    it('28. Authenticated registered user receives userState.isRegistered = true', async () => {
      const comp = await Competition.create(createBaseCompetition());

      // Register first
      await request(app)
        .post(`/api/v1/competitions/${comp.id}/register`)
        .set('Authorization', `Bearer ${defaultToken}`);

      // Check details API
      const res = await request(app)
        .get(`/api/v1/competitions/${comp.id}`)
        .set('Authorization', `Bearer ${defaultToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.userState.isRegistered).toBe(true);
      expect(res.body.data.userState.hasSubmitted).toBe(false);
    });

    it('29. Authenticated unregistered user receives userState.isRegistered = false', async () => {
      const comp = await Competition.create(createBaseCompetition());

      const res = await request(app)
        .get(`/api/v1/competitions/${comp.id}`)
        .set('Authorization', `Bearer ${defaultToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.userState.isRegistered).toBe(false);
      expect(res.body.data.userState.hasSubmitted).toBe(false);
    });

    it('30. Registered user receives actions.canRegister = false', async () => {
      const comp = await Competition.create(createBaseCompetition());

      // Register
      await request(app)
        .post(`/api/v1/competitions/${comp.id}/register`)
        .set('Authorization', `Bearer ${defaultToken}`);

      // Check details API
      const res = await request(app)
        .get(`/api/v1/competitions/${comp.id}`)
        .set('Authorization', `Bearer ${defaultToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.actions.canRegister).toBe(false);
      expect(res.body.data.actions.canSubmit).toBe(false);
    });

    it('31. Full competition returns actions.canRegister = false', async () => {
      const comp = await Competition.create(
        createBaseCompetition({
          maxParticipants: 10,
          registeredCount: 10,
        })
      );

      const res = await request(app)
        .get(`/api/v1/competitions/${comp.id}`)
        .set('Authorization', `Bearer ${defaultToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.actions.canRegister).toBe(false);
    });

    it('32. Anonymous user remains supported (userState.isRegistered = false)', async () => {
      const comp = await Competition.create(createBaseCompetition());

      const res = await request(app).get(`/api/v1/competitions/${comp.id}`);

      expect(res.status).toBe(200);
      expect(res.body.data.userState).toEqual({
        isRegistered: false,
        hasSubmitted: false,
      });
      expect(res.body.data.actions.canRegister).toBe(true);
      expect(res.body.data.actions.canSubmit).toBe(false);
    });
  });
});
