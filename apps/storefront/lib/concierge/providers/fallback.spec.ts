import { describe, expect, it, afterEach } from 'vitest';
import { hasAnyLiveProvider, polishWithFallback } from './fallback';

const KEYS = [
  'AI_PROVIDER',
  'AI_PROVIDER_ORDER',
  'OPENAI_API_KEY',
  'AI_API_KEY',
  'ANTHROPIC_API_KEY',
  'GEMINI_API_KEY',
  'GOOGLE_API_KEY',
] as const;

afterEach(() => {
  for (const key of KEYS) delete process.env[key];
});

describe('hasAnyLiveProvider', () => {
  it('is false in mock mode', () => {
    process.env.AI_PROVIDER = 'mock';
    process.env.OPENAI_API_KEY = 'sk-test';
    expect(hasAnyLiveProvider()).toBe(false);
  });

  it('is true in auto mode when any key is present', () => {
    process.env.AI_PROVIDER = 'auto';
    process.env.ANTHROPIC_API_KEY = 'ant-test';
    expect(hasAnyLiveProvider()).toBe(true);
  });
});

describe('polishWithFallback', () => {
  it('returns null when no keys are configured', async () => {
    process.env.AI_PROVIDER = 'auto';
    const result = await polishWithFallback({
      system: 'sys',
      user: 'hi',
      draft: 'draft',
    });
    expect(result).toBeNull();
  });
});
