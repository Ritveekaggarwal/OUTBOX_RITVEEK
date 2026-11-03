import crypto from 'node:crypto';
import { RequestHandler } from 'express';

const safeEqual = (a: string, b: string): boolean => {
  const left = crypto.createHash('sha256').update(a).digest();
  const right = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(left, right);
};

/** Protects internal dashboards (Bull Board) with HTTP basic auth. */
export const basicAuth =
  (username: string, password: string, realm = 'Queue Dashboard'): RequestHandler =>
  (req, res, next) => {
    const header = req.headers.authorization ?? '';
    const [scheme, encoded] = header.split(' ');
    if (scheme === 'Basic' && encoded) {
      const [user, ...rest] = Buffer.from(encoded, 'base64').toString('utf8').split(':');
      if (safeEqual(user ?? '', username) && safeEqual(rest.join(':'), password)) return next();
    }
    res.setHeader('WWW-Authenticate', `Basic realm="${realm}"`);
    res.status(401).send('Authentication required');
  };
