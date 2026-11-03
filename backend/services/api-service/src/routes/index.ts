import { RequestHandler, Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { EmailController } from '../controllers/email.controller';
import { HealthController } from '../controllers/health.controller';
import { SenderController } from '../controllers/sender.controller';
import { SlackController } from '../controllers/slack.controller';
import { asyncHandler } from '../utils/async-handler';
import { authRoutes } from './auth.routes';
import { emailRoutes } from './email.routes';
import { slackRoutes } from './slack.routes';

export interface ApiControllers {
  auth: AuthController;
  emails: EmailController;
  senders: SenderController;
  slack: SlackController;
  health: HealthController;
}

export interface ApiMiddlewares {
  authenticate: RequestHandler;
  credentialLimiter: RequestHandler;
}

export function apiRouter(controllers: ApiControllers, middlewares: ApiMiddlewares): Router {
  const router = Router();
  router.get('/health', asyncHandler(controllers.health.check));
  router.use('/auth', authRoutes(controllers.auth, middlewares.authenticate, middlewares.credentialLimiter));
  router.use('/slack', slackRoutes(controllers.slack, middlewares.authenticate));
  router.get('/senders', middlewares.authenticate, asyncHandler(controllers.senders.list));
  router.use('/emails', middlewares.authenticate, emailRoutes(controllers.emails));
  return router;
}
