import mongoose from 'mongoose';
import { Competition } from '../models/Competition';
import { Registration, RegistrationStatus, PaymentStatus } from '../models/Registration';
import { AppError } from '../utils/AppError';

export interface RegistrationResult {
  id: string;
  competitionId: string;
  userId: string;
  status: RegistrationStatus;
  paymentStatus: PaymentStatus;
  registeredAt: Date;
}

interface MongoDuplicateKeyError extends Error {
  code?: number;
  keyPattern?: Record<string, number>;
}

export const registrationService = {
  /**
   * Registers an authenticated user for a competition with concurrency-safe
   * atomic capacity reservation and transactional consistency.
   */
  async registerUserForCompetition(
    competitionId: string,
    userId: string
  ): Promise<RegistrationResult> {
    // 1. Strict 24-character hexadecimal ObjectId format validation
    if (!mongoose.isObjectIdOrHexString(competitionId)) {
      throw AppError.badRequest('Invalid competition ID format', 'INVALID_ID');
    }

    if (!mongoose.isObjectIdOrHexString(userId)) {
      throw AppError.badRequest('Invalid user ID format', 'INVALID_ID');
    }

    const session = await mongoose.startSession();

    try {
      let registrationResult: RegistrationResult | undefined;

      await session.withTransaction(async () => {
        // 2. Fetch competition within session
        const competition = await Competition.findById(competitionId).session(session);
        if (!competition) {
          throw AppError.notFound('Competition not found', 'COMPETITION_NOT_FOUND');
        }

        // 3. Single server-authoritative timestamp for lifecycle validation
        const now = new Date();
        const currentTime = now.getTime();
        const regStart = new Date(competition.registrationStart).getTime();
        const regEnd = new Date(competition.registrationEnd).getTime();

        // If outside registration dates or administrative status is DRAFT/COMPLETED
        if (
          competition.status === 'DRAFT' ||
          competition.status === 'COMPLETED' ||
          currentTime < regStart ||
          currentTime >= regEnd
        ) {
          throw AppError.conflict(
            'Registration is closed for this competition',
            'REGISTRATION_CLOSED'
          );
        }

        // If capacity is already reached during open window
        if (competition.registeredCount >= competition.maxParticipants) {
          throw AppError.conflict(
            'Competition registration is full',
            'REGISTRATION_FULL'
          );
        }

        // 4. Paid competition validation
        if (competition.entryFee > 0) {
          throw AppError.conflict(
            'Payment is required to register for this competition',
            'PAYMENT_REQUIRED'
          );
        }

        // 5. Early duplicate registration check
        const existingRegistration = await Registration.findOne({
          competitionId: competition._id,
          userId,
        }).session(session);

        if (existingRegistration) {
          throw AppError.conflict(
            'You are already registered for this competition',
            'ALREADY_REGISTERED'
          );
        }

        // 6. Atomic conditional capacity reservation
        const updatedCompetition = await Competition.findOneAndUpdate(
          {
            _id: competition._id,
            registeredCount: { $lt: competition.maxParticipants },
          },
          {
            $inc: { registeredCount: 1 },
          },
          {
            new: true,
            session,
          }
        );

        if (!updatedCompetition) {
          // Re-read competition to determine exact failure cause
          const currentComp = await Competition.findById(competition._id).session(session);
          if (!currentComp) {
            throw AppError.notFound('Competition not found', 'COMPETITION_NOT_FOUND');
          }

          if (currentComp.registeredCount >= currentComp.maxParticipants) {
            throw AppError.conflict(
              'Competition registration is full',
              'REGISTRATION_FULL'
            );
          }

          throw AppError.conflict(
            'Registration is closed for this competition',
            'REGISTRATION_CLOSED'
          );
        }

        // 7. Create registration record within the transaction
        const [registration] = await Registration.create(
          [
            {
              competitionId: competition._id,
              userId,
              status: 'REGISTERED',
              paymentStatus: 'NOT_REQUIRED',
              registeredAt: now,
            },
          ],
          { session }
        );

        registrationResult = {
          id: registration.id,
          competitionId: registration.competitionId.toString(),
          userId: registration.userId.toString(),
          status: registration.status,
          paymentStatus: registration.paymentStatus,
          registeredAt: registration.registeredAt,
        };
      });

      if (!registrationResult) {
        throw AppError.internal('Registration transaction failed to produce a result');
      }

      return registrationResult;
    } catch (error: unknown) {
      // Map MongoDB duplicate-key errors for (competitionId, userId) to ALREADY_REGISTERED
      const mongoError = error as MongoDuplicateKeyError;
      if (
        mongoError.code === 11000 &&
        (mongoError.keyPattern?.competitionId && mongoError.keyPattern?.userId ||
          mongoError.message?.includes('competitionId_1_userId_1'))
      ) {
        throw AppError.conflict(
          'You are already registered for this competition',
          'ALREADY_REGISTERED'
        );
      }

      throw error;
    } finally {
      await session.endSession();
    }
  },
};
