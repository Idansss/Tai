import { Inject, Injectable } from '@nestjs/common';

import { ApiProblemException } from '../platform/api-problem.exception.js';
import { hashOpaqueValue } from './auth-crypto.js';
import { AUTH_CONFIG } from './auth.tokens.js';
import type { AuthConfig } from './auth.types.js';

interface RateLimitEntry {
  count: number;
  resetsAt: number;
}

@Injectable()
export class AuthRateLimiterService {
  private readonly entries = new Map<string, RateLimitEntry>();

  constructor(@Inject(AUTH_CONFIG) private readonly config: AuthConfig) {}

  consume(scope: string, identity: string): void {
    const now = Date.now();
    const key = hashOpaqueValue(`${scope}:${identity}`, this.config.tokenPepper);
    const existing = this.entries.get(key);
    const windowMilliseconds = this.config.rateLimitWindowSeconds * 1_000;

    if (!existing || existing.resetsAt <= now) {
      this.entries.set(key, { count: 1, resetsAt: now + windowMilliseconds });
      this.pruneExpired(now);
      return;
    }

    existing.count += 1;
    if (existing.count > this.config.rateLimitMaxAttempts) {
      throw new ApiProblemException(
        'RATE_LIMITED',
        429,
        'Too many attempts. Please try again later.',
      );
    }
  }

  private pruneExpired(now: number): void {
    if (this.entries.size < 1_000) return;
    for (const [key, entry] of this.entries) {
      if (entry.resetsAt <= now) this.entries.delete(key);
    }
  }
}
