import { z } from 'zod';

const localAuthPepper = 'local-development-auth-pepper-change-me';

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
  });

export type Environment = z.infer<typeof EnvironmentSchema>;

export function loadEnvironment(input: NodeJS.ProcessEnv = process.env): Environment {
  return EnvironmentSchema.parse(input);
}
