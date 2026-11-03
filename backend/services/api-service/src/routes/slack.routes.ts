import { RequestHandler, Router } from 'express';
import { SlackController } from '../controllers/slack.controller';
import { asyncHandler } from '../utils/async-handler';

export function slackRoutes(controller: SlackController, authenticate: RequestHandler): Router {
  const router = Router();
  // Slack redirects the browser here (possibly via an HTTPS tunnel), so the
  // user is identified by the signed OAuth state instead of the session cookie.
  router.get('/oauth/callback', asyncHandler(controller.callback));
  router.use(authenticate);
  router.get('/status', asyncHandler(controller.status));
  router.post('/connect', asyncHandler(controller.connect));
  router.post('/test', asyncHandler(controller.test));
  router.delete('/', asyncHandler(controller.disconnect));
  return router;
}
