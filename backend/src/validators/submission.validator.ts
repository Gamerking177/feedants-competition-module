import { z } from 'zod';

export const createSubmissionSchema = z.object({
  fileUrl: z
    .string({ required_error: 'File URL is required' })
    .trim()
    .url('File URL must be a valid URL')
    .max(2048, 'File URL cannot exceed 2048 characters'),
  fileType: z
    .string({ required_error: 'File type is required' })
    .trim()
    .min(1, 'File type is required')
    .max(50, 'File type cannot exceed 50 characters')
    .toLowerCase(),
});

export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;
