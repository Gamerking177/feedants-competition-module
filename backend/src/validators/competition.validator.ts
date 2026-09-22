import { z } from 'zod';
import { COMPETITION_STATUSES } from '../models/Competition';

export const judgeValidationSchema = z.object({
  name: z.string({ required_error: 'Judge name is required' }).trim().min(1, 'Judge name is required'),
  designation: z.string().trim().optional(),
  organization: z.string().trim().optional(),
  avatarUrl: z.string().trim().url('Invalid avatar URL').optional().or(z.literal('')),
  videoUrl: z.string().trim().url('Invalid video URL').optional().or(z.literal('')),
});

export const rewardValidationSchema = z.object({
  position: z.number().int().min(1, 'Position must be a positive integer'),
  title: z.string({ required_error: 'Reward title is required' }).trim().min(1, 'Reward title is required'),
  amount: z.number().min(0, 'Amount cannot be negative').optional(),
  description: z.string().trim().optional(),
});

export const previousWinnerValidationSchema = z.object({
  name: z.string({ required_error: 'Winner name is required' }).trim().min(1, 'Winner name is required'),
  position: z.number().int().min(1, 'Position must be a positive integer'),
  year: z.number().int().min(2000, 'Year must be 2000 or later').optional(),
  imageUrl: z.string().trim().url('Invalid image URL').optional().or(z.literal('')),
});

export const judgingParameterValidationSchema = z.object({
  name: z.string({ required_error: 'Parameter name is required' }).trim().min(1, 'Parameter name is required'),
  description: z.string().trim().optional(),
  weight: z.number().min(0, 'Weight cannot be negative').optional(),
});

export const ruleValidationSchema = z.object({
  order: z.number().int().min(1, 'Rule order must be a positive integer'),
  title: z.string().trim().optional(),
  description: z.string({ required_error: 'Rule description is required' }).trim().min(1, 'Rule description is required'),
});

export const createCompetitionSchema = z
  .object({
    title: z
      .string({ required_error: 'Title is required' })
      .trim()
      .min(3, 'Title must be at least 3 characters long')
      .max(120, 'Title cannot exceed 120 characters'),
    slug: z
      .string({ required_error: 'Slug is required' })
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase URL-safe alphanumeric characters and hyphens'),
    category: z.string({ required_error: 'Category is required' }).trim().min(1, 'Category is required'),
    type: z.string({ required_error: 'Type is required' }).trim().min(1, 'Type is required'),
    description: z.string({ required_error: 'Description is required' }).trim().min(1, 'Description is required'),
    language: z.string().trim().default('English'),
    prizePool: z.number({ required_error: 'Prize pool is required' }).min(0, 'Prize pool cannot be negative'),
    entryFee: z.number().min(0, 'Entry fee cannot be negative').default(0),
    maxParticipants: z.number().int().min(1, 'Max participants must be at least 1'),
    registeredCount: z.number().int().min(0, 'Registered count cannot be negative').default(0),
    certificateAvailable: z.boolean().default(false),
    registrationStart: z.coerce.date({ required_error: 'Registration start date is required' }),
    registrationEnd: z.coerce.date({ required_error: 'Registration end date is required' }),
    submissionStart: z.coerce.date({ required_error: 'Submission start date is required' }),
    submissionEnd: z.coerce.date({ required_error: 'Submission end date is required' }),
    resultDate: z.coerce.date().optional(),
    judge: judgeValidationSchema.optional(),
    rewards: z.array(rewardValidationSchema).default([]),
    previousWinners: z.array(previousWinnerValidationSchema).default([]),
    judgingParameters: z.array(judgingParameterValidationSchema).default([]),
    rules: z.array(ruleValidationSchema).default([]),
    status: z.enum(COMPETITION_STATUSES as [string, ...string[]]).default('DRAFT'),
  })
  .refine((data) => data.registeredCount <= data.maxParticipants, {
    message: 'registeredCount cannot exceed maxParticipants',
    path: ['registeredCount'],
  })
  .refine((data) => data.registrationEnd.getTime() > data.registrationStart.getTime(), {
    message: 'registrationEnd must be after registrationStart',
    path: ['registrationEnd'],
  })
  .refine((data) => data.submissionStart.getTime() >= data.registrationEnd.getTime(), {
    message: 'submissionStart must be on or after registrationEnd',
    path: ['submissionStart'],
  })
  .refine((data) => data.submissionEnd.getTime() > data.submissionStart.getTime(), {
    message: 'submissionEnd must be after submissionStart',
    path: ['submissionEnd'],
  })
  .refine(
    (data) => {
      if (!data.resultDate) return true;
      return data.resultDate.getTime() >= data.submissionEnd.getTime();
    },
    {
      message: 'resultDate must be on or after submissionEnd',
      path: ['resultDate'],
    }
  );

export type CreateCompetitionInput = z.infer<typeof createCompetitionSchema>;
