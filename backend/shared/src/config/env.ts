import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

/**
 * Every service reads the single `backend/.env` file. We walk up from the
 * working directory so services can be started from their own folder or
 * from the backend root.
 */
function loadEnvFile(): void {
  if (process.env.ENV_FILE) {
    dotenv.config({ path: process.env.ENV_FILE });
    return;
  }
  let dir = process.cwd();
  for (let depth = 0; depth < 5; depth++) {
    const candidate = path.join(dir, '.env');
    if (fs.existsSync(candidate)) {
      dotenv.config({ path: candidate });
      return;
    }
    const parent = path.dirname(dir);
    if (parent === dir) return;
    dir = parent;
  }
}

loadEnvFile();

const optionalString = z
  .string()
  .optional()
  .transform((value) => (value && value.trim().length > 0 ? value.trim() : undefined));

const booleanString = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  API_PORT: z.coerce.number().int().positive().default(4000),
  API_BASE_URL: z.string().url().default('http://localhost:4000'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  /** Reverse proxies in front of the API (1 locally; 2 behind a Vercel rewrite + Render). */
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(1),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),
  ELASTICSEARCH_URL: z.string().url().default('http://localhost:9200'),
  ELASTICSEARCH_INDEX: z.string().min(1).default('emails'),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN_SECONDS: z.coerce.number().int().positive().default(60 * 60 * 24 * 7),
  ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, 'ENCRYPTION_KEY must be 64 hex characters (32 bytes)'),
  COOKIE_SECURE: booleanString,

  GOOGLE_CLIENT_ID: optionalString,
  GOOGLE_CLIENT_SECRET: optionalString,
  GOOGLE_REDIRECT_URI: z.string().url().default('http://localhost:4000/api/auth/google/callback'),

  SLACK_CLIENT_ID: optionalString,
  SLACK_CLIENT_SECRET: optionalString,
  SLACK_REDIRECT_URI: optionalString,
  /**
   * Extra HTTPS listener with an auto-generated localhost certificate. Slack
   * requires HTTPS redirect URLs; this avoids needing a tunnel in development.
   */
  LOCAL_HTTPS_PORT: z.coerce.number().int().positive().optional(),

  /** Optional fixed Ethereal accounts: "user1@ethereal.email:pass1,user2@ethereal.email:pass2" */
  ETHEREAL_SENDERS: optionalString,
  /** When no senders exist, this many Ethereal accounts are generated automatically. */
  ETHEREAL_AUTO_CREATE_COUNT: z.coerce.number().int().min(0).max(10).default(3),

  WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(100).default(5),
  MIN_DELAY_BETWEEN_EMAILS_MS: z.coerce.number().int().min(0).default(2000),
  MAX_EMAILS_PER_HOUR: z.coerce.number().int().min(0).default(500),
  MAX_EMAILS_PER_HOUR_PER_SENDER: z.coerce.number().int().min(0).default(200),
  EMAIL_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(3),
  MAX_RECIPIENTS_PER_CAMPAIGN: z.coerce.number().int().min(1).default(10000),

  BULL_BOARD_USER: z.string().min(1).default('admin'),
  BULL_BOARD_PASSWORD: z.string().min(8, 'BULL_BOARD_PASSWORD must be at least 8 characters'),

  API_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(1).default(300),
});

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`);
    // eslint-disable-next-line no-console
    console.error(`\nInvalid environment configuration:\n${issues.join('\n')}\n`);
    process.exit(1);
  }
  return parsed.data;
}

export const env: Env = parseEnv();

export const isGoogleAuthConfigured = (): boolean =>
  Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

export const isSlackConfigured = (): boolean =>
  Boolean(env.SLACK_CLIENT_ID && env.SLACK_CLIENT_SECRET && env.SLACK_REDIRECT_URI);
