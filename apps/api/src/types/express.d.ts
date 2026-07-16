import type { AuthenticatedSession } from '../auth/auth.types.js';

declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
      authSession?: AuthenticatedSession;
    }
  }
}

export {};
