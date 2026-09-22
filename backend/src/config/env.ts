import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env file
dotenv.config();

const envSchema = z.object({
  PORT: z
    .string()
    .default('5000')
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val > 0 && val <= 65535, {
      message: 'PORT must be a valid port number between 1 and 65535',
    }),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  MONGODB_URI: z
    .string({
      required_error: 'MONGODB_URI is required. Please provide a valid MongoDB connection string.',
    })
    .min(1, 'MONGODB_URI cannot be empty'),
  CORS_ORIGIN: z
    .string({
      required_error: 'CORS_ORIGIN is required (e.g. http://localhost:3000).',
    })
    .default('http://localhost:3000'),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formattedErrors = result.error.errors
      .map((err) => `  - [${err.path.join('.')}]: ${err.message}`)
      .join('\n');

    console.error(
      `\n❌ Invalid Environment Configuration:\n${formattedErrors}\n\nPlease check your .env file or environment settings.\n`
    );
    process.exit(1);
  }

  return Object.freeze(result.data);
}

export const env = validateEnv();
