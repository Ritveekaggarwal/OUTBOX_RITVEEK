import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Express } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import { env } from '@reachinbox/shared';
import { BULL_BOARD_PATH, createBullBoardRouter } from './admin/bull-board';
import { Container } from './container';
import { openApiDocument } from './docs/openapi';
import { createAuthenticate } from './middlewares/authenticate';
import { basicAuth } from './middlewares/basic-auth';
import { createErrorHandler, notFoundHandler } from './middlewares/error-handler';
import { createApiRateLimiter } from './middlewares/rate-limiter';
import { apiRouter } from './routes';

export function createApp(container: Container): Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(pinoHttp({ logger: container.logger, autoLogging: { ignore: (req) => req.url === '/api/health' } }));

  // Internal UIs need inline scripts/styles, so they get a relaxed CSP and are mounted first.
  app.use(
    BULL_BOARD_PATH,
    helmet({ contentSecurityPolicy: false }),
    basicAuth(env.BULL_BOARD_USER, env.BULL_BOARD_PASSWORD),
    createBullBoardRouter([container.queues.emailQueue, container.queues.notificationQueue]),
  );
  app.use(
    '/api/docs',
    helmet({ contentSecurityPolicy: false }),
    swaggerUi.serve,
    swaggerUi.setup(openApiDocument, {
      customSiteTitle: 'ReachInbox API Docs',
      swaggerOptions: { persistAuthorization: true },
    }),
  );
  app.get('/api/docs.json', (_req, res) => res.json(openApiDocument));

  app.use(helmet());
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    }),
  );
  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser());

  const authenticate = createAuthenticate(container.tokens);
  app.use('/api', createApiRateLimiter(container.redis, env.API_RATE_LIMIT_PER_MINUTE));
  app.use(
    '/api',
    apiRouter(container.controllers, {
      authenticate,
      credentialLimiter: createApiRateLimiter(container.redis, 10, 'rl:auth:'),
    }),
  );

  app.get('/', (_req, res) => res.redirect('/api/docs'));
  app.use(notFoundHandler);
  app.use(createErrorHandler(container.logger));
  return app;
}
