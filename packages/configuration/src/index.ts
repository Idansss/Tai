import { z } from 'zod';

const localAuthPepper = 'local-development-auth-pepper-change-me';
const localMfaEncryptionKey = 'bG9jYWwtZGV2ZWxvcG1lbnQtbWZhLWtleS0xMjM0NTY';

const EnvironmentSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    API_PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
    DATABASE_URL: z
      .string()
      .url()
      .default('postgresql://tai:local_development_only@localhost:5432/tai_manic?schema=public'),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    APP_PUBLIC_URL: z.string().url().default('http://localhost:3000'),
    SMTP_URL: z.string().url().default('smtp://localhost:1025'),
    REDIS_URL: z.string().url().default('redis://localhost:6379'),
    S3_ENDPOINT: z.string().url().default('http://localhost:9000'),
    S3_REGION: z.string().min(1).default('us-east-1'),
    S3_BUCKET: z.string().min(3).max(63).default('tai-manic-local'),
    S3_ACCESS_KEY: z.string().min(1).default('minio'),
    S3_SECRET_KEY: z.string().min(8).default('local_development_only'),
    MEDIA_MALWARE_SCAN_URL: z.string().url().optional(),
    PAYMENT_PROVIDER: z.enum(['mock', 'flutterwave']).default('mock'),
    MOCK_PAYMENT_WEBHOOK_SECRET: z
      .string()
      .min(16)
      .default('local-development-mock-webhook-secret'),
    FLUTTERWAVE_BASE_URL: z.string().url().default('https://api.flutterwave.com/v3'),
    FLUTTERWAVE_SECRET_KEY: z.string().min(1).optional(),
    FLUTTERWAVE_WEBHOOK_HASH: z.string().min(1).optional(),
    EMAIL_FROM: z.string().email().default('no-reply@taimanic.local'),
    AUTH_TOKEN_PEPPER: z.string().min(32).default(localAuthPepper),
    AUTH_COOKIE_NAME: z
      .string()
      .regex(/^[A-Za-z0-9_-]{1,64}$/)
      .default('tms_session'),
    AUTH_SESSION_TTL_SECONDS: z.coerce.number().int().min(300).max(31_536_000).default(2_592_000),
    AUTH_VERIFICATION_TTL_SECONDS: z.coerce.number().int().min(300).max(604_800).default(86_400),
    AUTH_RESET_TTL_SECONDS: z.coerce.number().int().min(300).max(86_400).default(3_600),
    AUTH_RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().min(1).max(3_600).default(60),
    AUTH_RATE_LIMIT_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(100).default(5),
    ADMIN_AUTH_COOKIE_NAME: z
      .string()
      .regex(/^[A-Za-z0-9_-]{1,64}$/)
      .default('tms_admin_session'),
    ADMIN_AUTH_SESSION_TTL_SECONDS: z.coerce.number().int().min(300).max(604_800).default(28_800),
    ADMIN_MFA_CHALLENGE_TTL_SECONDS: z.coerce.number().int().min(60).max(1_800).default(300),
    ADMIN_MFA_ENCRYPTION_KEY: z
      .string()
      .regex(/^[A-Za-z0-9_-]{43}$/)
      .default(localMfaEncryptionKey),
  })
  .superRefine((environment, context) => {
    if (
      environment.NODE_ENV === 'production' &&
      environment.AUTH_TOKEN_PEPPER === localAuthPepper
    ) {
      context.addIssue({
        code: 'custom',
        path: ['AUTH_TOKEN_PEPPER'],
        message: 'AUTH_TOKEN_PEPPER must be replaced in production.',
      });
    }
    if (
      environment.NODE_ENV === 'production' &&
      environment.ADMIN_MFA_ENCRYPTION_KEY === localMfaEncryptionKey
    ) {
      context.addIssue({
        code: 'custom',
        path: ['ADMIN_MFA_ENCRYPTION_KEY'],
        message: 'ADMIN_MFA_ENCRYPTION_KEY must be replaced in production.',
      });
    }
    if (environment.NODE_ENV === 'production' && !environment.MEDIA_MALWARE_SCAN_URL) {
      context.addIssue({
        code: 'custom',
        path: ['MEDIA_MALWARE_SCAN_URL'],
        message: 'MEDIA_MALWARE_SCAN_URL is required in production.',
      });
    }
    // The mock payment provider settles nothing; it must never be the production gateway.
    if (environment.NODE_ENV === 'production' && environment.PAYMENT_PROVIDER === 'mock') {
      context.addIssue({
        code: 'custom',
        path: ['PAYMENT_PROVIDER'],
        message: 'PAYMENT_PROVIDER must be a real gateway in production, not the mock.',
      });
    }
    // Flutterwave cannot verify a payment or a webhook without its credentials.
    if (environment.PAYMENT_PROVIDER === 'flutterwave') {
      if (!environment.FLUTTERWAVE_SECRET_KEY) {
        context.addIssue({
          code: 'custom',
          path: ['FLUTTERWAVE_SECRET_KEY'],
          message: 'FLUTTERWAVE_SECRET_KEY is required when PAYMENT_PROVIDER is flutterwave.',
        });
      }
      if (!environment.FLUTTERWAVE_WEBHOOK_HASH) {
        context.addIssue({
          code: 'custom',
          path: ['FLUTTERWAVE_WEBHOOK_HASH'],
          message: 'FLUTTERWAVE_WEBHOOK_HASH is required when PAYMENT_PROVIDER is flutterwave.',
        });
      }
    }
  });

export type Environment = z.infer<typeof EnvironmentSchema>;

export function loadEnvironment(input: NodeJS.ProcessEnv = process.env): Environment {
  return EnvironmentSchema.parse(input);
}
