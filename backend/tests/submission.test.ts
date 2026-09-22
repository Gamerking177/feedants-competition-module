import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import app from '../src/app';
import { Competition, ICompetition } from '../src/models/Competition';
import { User, IUserDocument } from '../src/models/User';
import { Registration } from '../src/models/Registration';
import { Submission } from '../src/models/Submission';
import { env } from '../src/config/env';

describe('Competition Submission Tests (38 Scenarios)', () => {
  let defaultUser: IUserDocument;
  let defaultToken: string;
  let replSet: MongoMemoryReplSet;

  beforeAll(async () => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Tests cannot run in production environment!');
    }

    // Start in-memory replica set for full MongoDB transaction/index support in tests
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const testUri = replSet.getUri();

    await mongoose.connect(testUri);
    await Registration.createIndexes();
    await Submission.createIndexes();
    await Competition.createIndexes();
    await User.createIndexes();
  });

  beforeEach(async () => {
    await Submission.deleteMany({});
    await Registration.deleteMany({});
    await Competition.deleteMany({});
    await User.deleteMany({});

    defaultUser = await User.create({
      name: 'Test Submitter',
      email: `submitter_${Date.now()}_${Math.random()}@example.com`,
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
    await Submission.deleteMany({});
    await Registration.deleteMany({});
    await Competition.deleteMany({});
    await User.deleteMany({});
  });

  afterAll(async () => {
    await Submission.deleteMany({});
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
      entryFee: 0,
      maxParticipants: 100,
      registeredCount: 1,
      certificateAvailable: true,
      registrationStart: new Date(now - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      registrationEnd: new Date(now - 2 * 24 * 60 * 60 * 1000),    // 2 days ago
      submissionStart: new Date(now - 1 * 24 * 60 * 60 * 1000),    // 1 day ago
      submissionEnd: new Date(now + 5 * 24 * 60 * 60 * 1000),      // in 5 days
      resultDate: new Date(now + 10 * 24 * 60 * 60 * 1000),       // in 10 days
      status: 'SUBMISSION_OPEN',
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

  const registerUserForCompetition = async (
    competitionId: string | mongoose.Types.ObjectId,
    userId: string | mongoose.Types.ObjectId
  ) => {
    return Registration.create({
      competitionId,
      userId,
      status: 'REGISTERED',
      paymentStatus: 'NOT_REQUIRED',
      registeredAt: new Date(),
    });
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
  // AUTHENTICATION (1-5)
  // ===================================================
  describe('Authentication (1-5)', () => {
    it('1. Anonymous submission returns 401 UNAUTHORIZED', async () => {
      const comp = await Competition.create(createBaseCompetition());

      const res = await request(app)
        .post(`/api/v1/competitions/${comp.id}/submission`)
        .send({ fileUrl: 'https://example.com/project.zip', fileType: 'zip' });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('2. Missing Authorization header returns 401 UNAUTHORIZED', async () => {
      const comp = await Competition.create(createBaseCompetition());

      const res = await request(app)
        .post(`/api/v1/competitions/${comp.id}/submission`)
        .send({ fileUrl: 'https://example.com/project.zip', fileType: 'zip' });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('3. Invalid token returns 401 INVALID_TOKEN', async () => {
      const comp = await Competition.create(createBaseCompetition());

      const res = await request(app)
        .post(`/api/v1/competitions/${comp.id}/submission`)
        .set('Authorization', 'Bearer invalid.jwt.token')
        .send({ fileUrl: 'https://example.com/project.zip', fileType: 'zip' });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('INVALID_TOKEN');
    });

    it('4. Inactive user (isActive: false) returns 401 ACCOUNT_INACTIVE and no submission is created', async () => {
      const comp = await Competition.create(createBaseCompetition());
      const inactiveUser = await User.create({
        name: 'Inactive Competitor',
        email: 'inactive@example.com',
        passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz12345678901234567890123456',
        role: 'user',
        isActive: false,
      });

      const inactiveToken = jwt.sign(
        { sub: inactiveUser.id, role: inactiveUser.role },
        env.JWT_SECRET,
        { expiresIn: '1h', algorithm: 'HS256' }
      );

      await registerUserForCompetition(comp.id, inactiveUser.id);

      const res = await request(app)
        .post(`/api/v1/competitions/${comp.id}/submission`)
        .set('Authorization', `Bearer ${inactiveToken}`)
        .send({ fileUrl: 'https://example.com/project.zip', fileType: 'zip' });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('ACCOUNT_INACTIVE');

      const submissionCount = await Submission.countDocuments({ competitionId: comp.id });
      expect(submissionCount).toBe(0);
    });

    it('5. Valid authenticated active user proceeds to submit', async () => {
      const comp = await Competition.create(createBaseCompetition());
      await registerUserForCompetition(comp.id, defaultUser.id);

      const res = await request(app)
        .post(`/api/v1/competitions/${comp.id}/submission`)
        .set('Authorization', `Bearer ${defaultToken}`)
        .send({ fileUrl: 'https://example.com/project.zip', fileType: 'zip' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.submission).toBeDefined();
      expect(res.body.data.submission.userId).toBe(defaultUser.id);
    });
  });

  // ===================================================
  // COMPETITION VALIDATION (6-7)
  // ===================================================
  describe('Competition Validation (6-7)', () => {
    it('6. Invalid competition ID format returns 400 INVALID_ID', async () => {
      const res = await request(app)
        .post('/api/v1/competitions/invalid-id-format/submission')
        .set('Authorization', `Bearer ${defaultToken}`)
        .send({ fileUrl: 'https://example.com/project.zip', fileType: 'zip' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_ID');
    });

    it('7. Unknown competition returns 404 COMPETITION_NOT_FOUND', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .post(`/api/v1/competitions/${nonExistentId}/submission`)
        .set('Authorization', `Bearer ${defaultToken}`)
        .send({ fileUrl: 'https://example.com/project.zip', fileType: 'zip' });

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('COMPETITION_NOT_FOUND');
    });
  });

  // ===================================================
  // LIFECYCLE ENFORCEMENT & BOUNDARY CONDITIONS (8-14)
  // ===================================================
  describe('Lifecycle Enforcement & Boundary Conditions (8-14)', () => {
    it('8. Submission before submissionStart is rejected with 409 SUBMISSION_NOT_OPEN', async () => {
      const now = Date.now();
      const comp = await Competition.create(
        createBaseCompetition({
          registrationStart: new Date(now - 10 * 24 * 60 * 60 * 1000),
          registrationEnd: new Date(now - 1 * 24 * 60 * 60 * 1000),
          submissionStart: new Date(now + 1 * 24 * 60 * 60 * 1000), // in future
          submissionEnd: new Date(now + 7 * 24 * 60 * 60 * 1000),
          resultDate: new Date(now + 14 * 24 * 60 * 60 * 1000),
          status: 'REGISTRATION_CLOSED',
        })
      );
      await registerUserForCompetition(comp.id, defaultUser.id);

      const res = await request(app)
        .post(`/api/v1/competitions/${comp.id}/submission`)
        .set('Authorization', `Bearer ${defaultToken}`)
        .send({ fileUrl: 'https://example.com/project.zip', fileType: 'zip' });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('SUBMISSION_NOT_OPEN');
    });

    it('9. Submission exactly when submission starts is allowed', async () => {
      const now = new Date();
      const comp = await Competition.create(
        createBaseCompetition({
          registrationStart: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
          registrationEnd: new Date(now.getTime() - 1 * 60 * 1000),
          submissionStart: new Date(now.getTime() - 1000), // started 1 second ago
          submissionEnd: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
          resultDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
          status: 'SUBMISSION_OPEN',
        })
      );
      await registerUserForCompetition(comp.id, defaultUser.id);

      const res = await request(app)
        .post(`/api/v1/competitions/${comp.id}/submission`)
        .set('Authorization', `Bearer ${defaultToken}`)
        .send({ fileUrl: 'https://example.com/project.zip', fileType: 'zip' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('10. Submission during submission window is allowed', async () => {
      const comp = await Competition.create(createBaseCompetition());
      await registerUserForCompetition(comp.id, defaultUser.id);

      const res = await request(app)
        .post(`/api/v1/competitions/${comp.id}/submission`)
        .set('Authorization', `Bearer ${defaultToken}`)
        .send({ fileUrl: 'https://example.com/project.zip', fileType: 'zip' });

      expect(res.status).toBe(201);
      expect(res.body.data.submission.status).toBe('SUBMITTED');
    });

    it('11. Submission exactly at submissionEnd is rejected with 409 SUBMISSION_NOT_OPEN', async () => {
      const now = new Date();
      const comp = await Competition.create(
        createBaseCompetition({
          registrationStart: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
          registrationEnd: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
          submissionStart: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
          submissionEnd: new Date(now.getTime() - 1000), // ended 1 second ago
          resultDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
          status: 'SUBMISSION_CLOSED',
        })
      );
      await registerUserForCompetition(comp.id, defaultUser.id);

      const res = await request(app)
        .post(`/api/v1/competitions/${comp.id}/submission`)
        .set('Authorization', `Bearer ${defaultToken}`)
        .send({ fileUrl: 'https://example.com/project.zip', fileType: 'zip' });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('SUBMISSION_NOT_OPEN');
    });

    it('12. Submission after submissionEnd is rejected with 409 SUBMISSION_NOT_OPEN', async () => {
      const now = Date.now();
      const comp = await Competition.create(
        createBaseCompetition({
          registrationStart: new Date(now - 10 * 24 * 60 * 60 * 1000),
          registrationEnd: new Date(now - 5 * 24 * 60 * 60 * 1000),
          submissionStart: new Date(now - 4 * 24 * 60 * 60 * 1000),
          submissionEnd: new Date(now - 1 * 24 * 60 * 60 * 1000), // 1 day ago
          resultDate: new Date(now + 5 * 24 * 60 * 60 * 1000),
          status: 'SUBMISSION_CLOSED',
        })
      );
      await registerUserForCompetition(comp.id, defaultUser.id);

      const res = await request(app)
        .post(`/api/v1/competitions/${comp.id}/submission`)
        .set('Authorization', `Bearer ${defaultToken}`)
        .send({ fileUrl: 'https://example.com/project.zip', fileType: 'zip' });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('SUBMISSION_NOT_OPEN');
    });

    it('13. Result published competition rejects submission with 409 SUBMISSION_NOT_OPEN', async () => {
      const now = Date.now();
      const comp = await Competition.create(
        createBaseCompetition({
          registrationStart: new Date(now - 15 * 24 * 60 * 60 * 1000),
          registrationEnd: new Date(now - 10 * 24 * 60 * 60 * 1000),
          submissionStart: new Date(now - 9 * 24 * 60 * 60 * 1000),
          submissionEnd: new Date(now - 5 * 24 * 60 * 60 * 1000),
          resultDate: new Date(now - 1 * 24 * 60 * 60 * 1000), // in past
          status: 'RESULT_PUBLISHED',
        })
      );
      await registerUserForCompetition(comp.id, defaultUser.id);

      const res = await request(app)
        .post(`/api/v1/competitions/${comp.id}/submission`)
        .set('Authorization', `Bearer ${defaultToken}`)
        .send({ fileUrl: 'https://example.com/project.zip', fileType: 'zip' });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('SUBMISSION_NOT_OPEN');
    });

    it('14. Completed competition rejects submission with 409 SUBMISSION_NOT_OPEN', async () => {
      const comp = await Competition.create(
        createBaseCompetition({
          status: 'COMPLETED',
        })
      );
      await registerUserForCompetition(comp.id, defaultUser.id);

      const res = await request(app)
        .post(`/api/v1/competitions/${comp.id}/submission`)
        .set('Authorization', `Bearer ${defaultToken}`)
        .send({ fileUrl: 'https://example.com/project.zip', fileType: 'zip' });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('SUBMISSION_NOT_OPEN');
    });
  });

  // ===================================================
  // REGISTRATION PREREQUISITE (15-17)
  // ===================================================
  describe('Registration Prerequisite (15-17)', () => {
    it('15. Registered user can submit', async () => {
      const comp = await Competition.create(createBaseCompetition());
      await registerUserForCompetition(comp.id, defaultUser.id);

      const res = await request(app)
        .post(`/api/v1/competitions/${comp.id}/submission`)
        .set('Authorization', `Bearer ${defaultToken}`)
        .send({ fileUrl: 'https://example.com/project.zip', fileType: 'zip' });

      expect(res.status).toBe(201);
      expect(res.body.data.submission.userId).toBe(defaultUser.id);
    });

    it('16. Unregistered user returns 409 NOT_REGISTERED', async () => {
      const comp = await Competition.create(createBaseCompetition());
      // Notice: defaultUser is NOT registered for comp

      const res = await request(app)
        .post(`/api/v1/competitions/${comp.id}/submission`)
        .set('Authorization', `Bearer ${defaultToken}`)
        .send({ fileUrl: 'https://example.com/project.zip', fileType: 'zip' });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('NOT_REGISTERED');

      const submission = await Submission.findOne({ competitionId: comp.id });
      expect(submission).toBeNull();
    });

    it('17. Client-supplied userId cannot impersonate another user', async () => {
      const comp = await Competition.create(createBaseCompetition());
      const victim = await createAdditionalUser(10);
      await registerUserForCompetition(comp.id, defaultUser.id);
      await registerUserForCompetition(comp.id, victim.user.id);

      const res = await request(app)
        .post(`/api/v1/competitions/${comp.id}/submission`)
        .set('Authorization', `Bearer ${defaultToken}`)
        .send({
          fileUrl: 'https://example.com/project.zip',
          fileType: 'zip',
          userId: victim.user.id, // Attempt to spoof victim
        });

      expect(res.status).toBe(201);
      expect(res.body.data.submission.userId).toBe(defaultUser.id);
      expect(res.body.data.submission.userId).not.toBe(victim.user.id);

      // Verify DB record belongs strictly to defaultUser
      const victimSub = await Submission.findOne({ userId: victim.user.id });
      expect(victimSub).toBeNull();

      const userSub = await Submission.findOne({ userId: defaultUser.id });
      expect(userSub).not.toBeNull();
    });
  });

  // ===================================================
  // DUPLICATE PROTECTION (18-20)
  // ===================================================
  describe('Duplicate Protection (18-20)', () => {
    it('18. Existing submission returns 409 ALREADY_SUBMITTED', async () => {
      const comp = await Competition.create(createBaseCompetition());
      await registerUserForCompetition(comp.id, defaultUser.id);

      await Submission.create({
        competitionId: comp._id,
        userId: defaultUser._id,
        fileUrl: 'https://example.com/initial.zip',
        fileType: 'zip',
        status: 'SUBMITTED',
        submittedAt: new Date(),
      });

      const res = await request(app)
        .post(`/api/v1/competitions/${comp.id}/submission`)
        .set('Authorization', `Bearer ${defaultToken}`)
        .send({ fileUrl: 'https://example.com/second.zip', fileType: 'zip' });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('ALREADY_SUBMITTED');
    });

    it('19. Two sequential submission attempts: first succeeds, second fails with 409 ALREADY_SUBMITTED', async () => {
      const comp = await Competition.create(createBaseCompetition());
      await registerUserForCompetition(comp.id, defaultUser.id);

      const res1 = await request(app)
        .post(`/api/v1/competitions/${comp.id}/submission`)
        .set('Authorization', `Bearer ${defaultToken}`)
        .send({ fileUrl: 'https://example.com/first.zip', fileType: 'zip' });

      expect(res1.status).toBe(201);

      const res2 = await request(app)
        .post(`/api/v1/competitions/${comp.id}/submission`)
        .set('Authorization', `Bearer ${defaultToken}`)
        .send({ fileUrl: 'https://example.com/second.zip', fileType: 'zip' });

      expect(res2.status).toBe(409);
      expect(res2.body.code).toBe('ALREADY_SUBMITTED');

      const count = await Submission.countDocuments({ competitionId: comp.id, userId: defaultUser.id });
      expect(count).toBe(1);
    });

    it('20. Concurrent duplicate submissions: exactly one succeeds, others fail with 409 ALREADY_SUBMITTED', async () => {
      const comp = await Competition.create(createBaseCompetition());
      await registerUserForCompetition(comp.id, defaultUser.id);

      // Send 5 concurrent submission requests
      const requests = Array.from({ length: 5 }, () =>
        request(app)
          .post(`/api/v1/competitions/${comp.id}/submission`)
          .set('Authorization', `Bearer ${defaultToken}`)
          .send({ fileUrl: 'https://example.com/concurrent.zip', fileType: 'zip' })
      );

      const responses = await Promise.all(requests);

      const successes = responses.filter((r) => r.status === 201);
      const conflicts = responses.filter((r) => r.status === 409);

      expect(successes).toHaveLength(1);
      expect(conflicts).toHaveLength(4);

      for (const res of conflicts) {
        expect(res.body.code).toBe('ALREADY_SUBMITTED');
      }

      const totalDocuments = await Submission.countDocuments({
        competitionId: comp.id,
        userId: defaultUser.id,
      });
      expect(totalDocuments).toBe(1);
    });
  });

  // ===================================================
  // PAYLOAD VALIDATION (21-26)
  // ===================================================
  describe('Payload Validation (21-26)', () => {
    it('21. Missing fileUrl returns 400 VALIDATION_ERROR', async () => {
      const comp = await Competition.create(createBaseCompetition());

      const res = await request(app)
        .post(`/api/v1/competitions/${comp.id}/submission`)
        .set('Authorization', `Bearer ${defaultToken}`)
        .send({ fileType: 'zip' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('22. Invalid fileUrl (not a URL) returns 400 VALIDATION_ERROR', async () => {
      const comp = await Competition.create(createBaseCompetition());

      const res = await request(app)
        .post(`/api/v1/competitions/${comp.id}/submission`)
        .set('Authorization', `Bearer ${defaultToken}`)
        .send({ fileUrl: 'not-a-valid-url', fileType: 'zip' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('23. Missing fileType returns 400 VALIDATION_ERROR', async () => {
      const comp = await Competition.create(createBaseCompetition());

      const res = await request(app)
        .post(`/api/v1/competitions/${comp.id}/submission`)
        .set('Authorization', `Bearer ${defaultToken}`)
        .send({ fileUrl: 'https://example.com/project.zip' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('24. Empty fileType returns 400 VALIDATION_ERROR', async () => {
      const comp = await Competition.create(createBaseCompetition());

      const res = await request(app)
        .post(`/api/v1/competitions/${comp.id}/submission`)
        .set('Authorization', `Bearer ${defaultToken}`)
        .send({ fileUrl: 'https://example.com/project.zip', fileType: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('25. Excessively long fileUrl returns 400 VALIDATION_ERROR', async () => {
      const comp = await Competition.create(createBaseCompetition());
      const longUrl = 'https://example.com/' + 'a'.repeat(2100);

      const res = await request(app)
        .post(`/api/v1/competitions/${comp.id}/submission`)
        .set('Authorization', `Bearer ${defaultToken}`)
        .send({ fileUrl: longUrl, fileType: 'zip' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('26. Excessively long fileType returns 400 VALIDATION_ERROR', async () => {
      const comp = await Competition.create(createBaseCompetition());
      const longType = 'a'.repeat(55);

      const res = await request(app)
        .post(`/api/v1/competitions/${comp.id}/submission`)
        .set('Authorization', `Bearer ${defaultToken}`)
        .send({ fileUrl: 'https://example.com/project.zip', fileType: longType });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });
  });

  // ===================================================
  // SECURITY & INTEGRITY (27-30)
  // ===================================================
  describe('Security & Integrity (27-30)', () => {
    it('27. Client cannot set submittedAt through body (persisted document verified in DB)', async () => {
      const comp = await Competition.create(createBaseCompetition());
      await registerUserForCompetition(comp.id, defaultUser.id);
      const spoofedDate = '2000-01-01T00:00:00.000Z';

      const res = await request(app)
        .post(`/api/v1/competitions/${comp.id}/submission`)
        .set('Authorization', `Bearer ${defaultToken}`)
        .send({
          fileUrl: 'https://example.com/project.zip',
          fileType: 'zip',
          submittedAt: spoofedDate,
        });

      expect(res.status).toBe(201);

      const persisted = await Submission.findOne({ competitionId: comp.id, userId: defaultUser.id });
      expect(persisted).not.toBeNull();
      expect(persisted?.submittedAt.toISOString()).not.toBe(spoofedDate);
      // Ensure submittedAt was generated around now
      expect(Date.now() - persisted!.submittedAt.getTime()).toBeLessThan(5000);
    });

    it('28. Client cannot set status through body (persisted document verified in DB)', async () => {
      const comp = await Competition.create(createBaseCompetition());
      await registerUserForCompetition(comp.id, defaultUser.id);

      const res = await request(app)
        .post(`/api/v1/competitions/${comp.id}/submission`)
        .set('Authorization', `Bearer ${defaultToken}`)
        .send({
          fileUrl: 'https://example.com/project.zip',
          fileType: 'zip',
          status: 'ACCEPTED_WINNER',
        });

      expect(res.status).toBe(201);

      const persisted = await Submission.findOne({ competitionId: comp.id, userId: defaultUser.id });
      expect(persisted?.status).toBe('SUBMITTED');
    });

    it('29. Client cannot set competitionId through body (persisted document verified in DB)', async () => {
      const comp = await Competition.create(createBaseCompetition());
      const spoofedCompId = new mongoose.Types.ObjectId().toString();
      await registerUserForCompetition(comp.id, defaultUser.id);

      const res = await request(app)
        .post(`/api/v1/competitions/${comp.id}/submission`)
        .set('Authorization', `Bearer ${defaultToken}`)
        .send({
          fileUrl: 'https://example.com/project.zip',
          fileType: 'zip',
          competitionId: spoofedCompId,
        });

      expect(res.status).toBe(201);

      const persisted = await Submission.findOne({ userId: defaultUser.id });
      expect(persisted?.competitionId.toString()).toBe(comp.id);
      expect(persisted?.competitionId.toString()).not.toBe(spoofedCompId);
    });

    it('30. Backend determines identity strictly from JWT (persisted document verified in DB)', async () => {
      const comp = await Competition.create(createBaseCompetition());
      const spoofedUserId = new mongoose.Types.ObjectId().toString();
      await registerUserForCompetition(comp.id, defaultUser.id);

      const res = await request(app)
        .post(`/api/v1/competitions/${comp.id}/submission`)
        .set('Authorization', `Bearer ${defaultToken}`)
        .set('X-User-ID', spoofedUserId)
        .send({
          fileUrl: 'https://example.com/project.zip',
          fileType: 'zip',
          userId: spoofedUserId,
        });

      expect(res.status).toBe(201);

      const persisted = await Submission.findOne({ competitionId: comp.id });
      expect(persisted?.userId.toString()).toBe(defaultUser.id);
      expect(persisted?.userId.toString()).not.toBe(spoofedUserId);
    });
  });

  // ===================================================
  // COMPETITION DETAILS API INTEGRATION (31-35)
  // ===================================================
  describe('Competition Details API Integration (31-35)', () => {
    it('31. Anonymous details: isRegistered false, hasSubmitted false, canSubmit false', async () => {
      const comp = await Competition.create(createBaseCompetition());

      const res = await request(app).get(`/api/v1/competitions/${comp.id}`);

      expect(res.status).toBe(200);
      expect(res.body.data.userState).toEqual({
        isRegistered: false,
        hasSubmitted: false,
      });
      expect(res.body.data.actions.canSubmit).toBe(false);
    });

    it('32. Registered user during submission window: canSubmit true, hasSubmitted false', async () => {
      const comp = await Competition.create(createBaseCompetition());
      await registerUserForCompetition(comp.id, defaultUser.id);

      const res = await request(app)
        .get(`/api/v1/competitions/${comp.id}`)
        .set('Authorization', `Bearer ${defaultToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.userState).toEqual({
        isRegistered: true,
        hasSubmitted: false,
      });
      expect(res.body.data.actions.canSubmit).toBe(true);
    });

    it('33. Registered user after submission: hasSubmitted true, canSubmit false', async () => {
      const comp = await Competition.create(createBaseCompetition());
      await registerUserForCompetition(comp.id, defaultUser.id);

      // Submit entry
      await request(app)
        .post(`/api/v1/competitions/${comp.id}/submission`)
        .set('Authorization', `Bearer ${defaultToken}`)
        .send({ fileUrl: 'https://example.com/project.zip', fileType: 'zip' });

      const res = await request(app)
        .get(`/api/v1/competitions/${comp.id}`)
        .set('Authorization', `Bearer ${defaultToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.userState).toEqual({
        isRegistered: true,
        hasSubmitted: true,
      });
      expect(res.body.data.actions.canSubmit).toBe(false);
    });

    it('34. Unregistered user during submission window: canSubmit false', async () => {
      const comp = await Competition.create(createBaseCompetition());
      // Unregistered user

      const res = await request(app)
        .get(`/api/v1/competitions/${comp.id}`)
        .set('Authorization', `Bearer ${defaultToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.userState.isRegistered).toBe(false);
      expect(res.body.data.actions.canSubmit).toBe(false);
    });

    it('35. Registered user before submission window: canSubmit false', async () => {
      const now = Date.now();
      const comp = await Competition.create(
        createBaseCompetition({
          registrationStart: new Date(now - 5 * 24 * 60 * 60 * 1000),
          registrationEnd: new Date(now + 2 * 24 * 60 * 60 * 1000),
          submissionStart: new Date(now + 3 * 24 * 60 * 60 * 1000), // in future
          submissionEnd: new Date(now + 8 * 24 * 60 * 60 * 1000),
          resultDate: new Date(now + 12 * 24 * 60 * 60 * 1000),
          status: 'REGISTRATION_OPEN',
        })
      );
      await registerUserForCompetition(comp.id, defaultUser.id);

      const res = await request(app)
        .get(`/api/v1/competitions/${comp.id}`)
        .set('Authorization', `Bearer ${defaultToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.userState.isRegistered).toBe(true);
      expect(res.body.data.actions.canSubmit).toBe(false);
    });
  });

  // ===================================================
  // DATABASE & CONCURRENCY CONSTRAINTS (36-38)
  // ===================================================
  describe('Database & Concurrency Constraints (36-38)', () => {
    it('36. Unique compound index { competitionId: 1, userId: 1 } exists in MongoDB', async () => {
      const indexes = await Submission.collection.indexes();
      const compoundIndex = indexes.find(
        (idx) => idx.key?.competitionId === 1 && idx.key?.userId === 1 && idx.unique === true
      );
      expect(compoundIndex).toBeDefined();

      const comp = await Competition.create(createBaseCompetition());
      await Submission.create({
        competitionId: comp._id,
        userId: defaultUser._id,
        fileUrl: 'https://example.com/one.zip',
        fileType: 'zip',
        status: 'SUBMITTED',
        submittedAt: new Date(),
      });

      let duplicateError: unknown;
      try {
        await Submission.create({
          competitionId: comp._id,
          userId: defaultUser._id,
          fileUrl: 'https://example.com/two.zip',
          fileType: 'zip',
          status: 'SUBMITTED',
          submittedAt: new Date(),
        });
      } catch (err) {
        duplicateError = err;
      }

      expect(duplicateError).toBeDefined();
      expect((duplicateError as { code?: number }).code).toBe(11000);
    });

    it('37. Concurrent submissions for same user/competition result in exactly one successful submission', async () => {
      const comp = await Competition.create(createBaseCompetition());
      await registerUserForCompetition(comp.id, defaultUser.id);

      const requests = Array.from({ length: 5 }, () =>
        request(app)
          .post(`/api/v1/competitions/${comp.id}/submission`)
          .set('Authorization', `Bearer ${defaultToken}`)
          .send({ fileUrl: 'https://example.com/file.zip', fileType: 'zip' })
      );

      const responses = await Promise.all(requests);
      const successes = responses.filter((r) => r.status === 201);
      const conflicts = responses.filter((r) => r.status === 409);

      expect(successes).toHaveLength(1);
      expect(conflicts).toHaveLength(4);
    });

    it('38. No duplicate documents are created in database under concurrency', async () => {
      const comp = await Competition.create(createBaseCompetition());
      await registerUserForCompetition(comp.id, defaultUser.id);

      const requests = Array.from({ length: 6 }, () =>
        request(app)
          .post(`/api/v1/competitions/${comp.id}/submission`)
          .set('Authorization', `Bearer ${defaultToken}`)
          .send({ fileUrl: 'https://example.com/race.zip', fileType: 'zip' })
      );

      await Promise.all(requests);

      const count = await Submission.countDocuments({
        competitionId: comp.id,
        userId: defaultUser.id,
      });
      expect(count).toBe(1);
    });
  });
});
