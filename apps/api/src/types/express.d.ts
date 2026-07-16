import type { AuthenticatedSession } from '../auth/auth.types.js';
import type { AdminAuthenticatedSession } from '../admin-auth/admin-auth.types.js';

declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
      authSession?: AuthenticatedSession;
      adminSession?: AdminAuthenticatedSession;
    }
  }
}

export {};
