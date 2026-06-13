import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  BOT_TOKEN: z.string().optional().default(''),
  TELEGRAM_BOT_USERNAME: z.string().optional().default(''),
  WEB_APP_URL: z.string().default('http://localhost:5173'),
  SERVER_URL: z.string().default('http://localhost:4000'),
  JWT_SECRET: z.string().min(1).default('dev-insecure-secret-change-me'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  ALLOW_DEV_AUTH: z
    .string()
    .optional()
    .transform((v) => v === 'true')
    .default('false'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment configuration');
}

export const env = parsed.data;

export const corsOrigins = env.CORS_ORIGIN.split(',').map((s) => s.trim());
