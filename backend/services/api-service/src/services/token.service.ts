import jwt from 'jsonwebtoken';
import { CookieOptions } from 'express';
import { env } from '@reachinbox/shared';

export const SESSION_COOKIE = 'rb_session';

export interface TokenPayload {
  sub: string;
}

/** Issues and verifies session JWTs plus short-lived signed state tokens for OAuth flows. */
export class TokenService {
  sign(userId: string): string {
    return jwt.sign({}, env.JWT_SECRET, {
      subject: userId,
      expiresIn: env.JWT_EXPIRES_IN_SECONDS,
      algorithm: 'HS256',
    });
  }

  verify(token: string): TokenPayload {
    const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    if (typeof payload === 'string' || !payload.sub) throw new Error('Invalid token');
    return { sub: payload.sub };
  }

  signState(purpose: string, userId?: string): string {
    return jwt.sign({ purpose }, env.JWT_SECRET, {
      subject: userId ?? 'anonymous',
      expiresIn: 600,
      algorithm: 'HS256',
    });
  }

  verifyState(token: string, purpose: string): string {
    const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    if (typeof payload === 'string' || payload.purpose !== purpose || !payload.sub) {
      throw new Error('Invalid OAuth state');
    }
    return payload.sub;
  }

  cookieOptions(maxAgeMs = env.JWT_EXPIRES_IN_SECONDS * 1000): CookieOptions {
    return { httpOnly: true, secure: env.COOKIE_SECURE, sameSite: 'lax', path: '/', maxAge: maxAgeMs };
  }
}
