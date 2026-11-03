import { RequestHandler } from 'express';
import { TokenService, SESSION_COOKIE } from '../services/token.service';
import { AppError } from '../utils/app-error';

/** Accepts the httpOnly session cookie (browser) or a Bearer token (Swagger / Postman). */
export const createAuthenticate =
  (tokens: TokenService): RequestHandler =>
  (req, _res, next) => {
    const header = req.headers.authorization;
    const bearer = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    const token = bearer ?? (req.cookies?.[SESSION_COOKIE] as string | undefined);

    if (!token) return next(AppError.unauthorized());

    try {
      req.auth = { userId: tokens.verify(token).sub };
      next();
    } catch {
      next(AppError.unauthorized('Session expired, please log in again'));
    }
  };
