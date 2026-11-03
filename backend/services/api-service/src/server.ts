import { disconnectPrisma, disconnectRedis, env } from '@reachinbox/shared';
import { createApp } from './app';
import { createContainer } from './container';
import { startLocalHttps } from './local-https';

async function bootstrap(): Promise<void> {
  const container = createContainer();
  const { logger } = container;

  await container.search.ensureIndex();
  await container.senderService.ensureSenders();

  const app = createApp(container);
  const server = app.listen(env.API_PORT, () => {
    logger.info(`API ready on ${env.API_BASE_URL}`);
    logger.info(`Swagger docs:   ${env.API_BASE_URL}/api/docs`);
    logger.info(`Queue board:    ${env.API_BASE_URL}/admin/queues`);
  });
  const httpsServer =
    env.LOCAL_HTTPS_PORT && env.NODE_ENV !== 'production'
      ? startLocalHttps(app, env.LOCAL_HTTPS_PORT, logger)
      : undefined;

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down API');
    server.close();
    httpsServer?.close();
    await Promise.allSettled([
      container.queues.emailQueue.close(),
      container.queues.notificationQueue.close(),
    ]);
    await container.queueConnection.quit().catch(() => undefined);
    await disconnectRedis();
    await disconnectPrisma();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('API failed to start', error);
  process.exit(1);
});
