import { RequestHandler, Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validate } from '../middlewares/validate';
import { asyncHandler } from '../utils/async-handler';
import { loginSchema, registerSchema } from '../validators/schemas';

export function authRoutes(
  controller: AuthController,
  authenticate: RequestHandler,
  credentialLimiter: RequestHandler,
): Router {
  const router = Router();
  router.post('/register', credentialLimiter, validate({ body: registerSchema }), asyncHandler(controller.register));
  router.post('/login', credentialLimiter, validate({ body: loginSchema }), asyncHandler(controller.login));
  router.post('/logout', asyncHandler(controller.logout));
  router.get('/me', authenticate, asyncHandler(controller.me));
  router.get('/google', asyncHandler(controller.googleStart));
  router.get('/google/callback', asyncHandler(controller.googleCallback));
  return router;
}
