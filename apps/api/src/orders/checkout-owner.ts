import { randomBytes } from 'node:crypto';

import type { Request, Response } from 'express';

import { readCookie } from '../auth/auth-cookie.js';
import type { AuthService } from '../auth/auth.service.js';
import type { AuthConfig } from '../auth/auth.types.js';
import type { CartOwner } from '../cart/cart.service.js';

/** The guest cart cookie, matching the cart controller so checkout reads the same cart. */
const GUEST_COOKIE = 'tms_cart';
const GUEST_COOKIE_TTL_SECONDS = 30 * 24 * 60 * 60;

/**
 * Resolves who a checkout belongs to, mirroring the cart controller. Checkout is open to guests,
 * so a missing session is normal and a guest token is issued on first contact. A signed-in
 * customer keeps their guest token for this request so the two carts merge once before the order
 * is read from the merged cart.
 */
export async function resolveCartOwner(
  request: Request,
  response: Response,
  auth: AuthService,
  config: AuthConfig,
): Promise<CartOwner> {
  const sessionToken = readCookie(request.headers.cookie, config.cookieName);
  const authenticated = sessionToken ? await auth.validateSession(sessionToken) : null;
  const guestToken = readCookie(request.headers.cookie, GUEST_COOKIE);

  if (authenticated) {
    if (guestToken) response.clearCookie(GUEST_COOKIE, { path: '/api/v1' });
    return { userId: authenticated.session.user.id, guestToken };
  }

  const token = guestToken ?? randomBytes(32).toString('base64url');
  if (!guestToken) {
    response.cookie(GUEST_COOKIE, token, {
      httpOnly: true,
      secure: config.nodeEnvironment === 'production',
      sameSite: 'lax',
      path: '/api/v1',
      maxAge: GUEST_COOKIE_TTL_SECONDS * 1_000,
    });
  }
  return { guestToken: token };
}
