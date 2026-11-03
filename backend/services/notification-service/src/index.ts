import { Job, Worker } from 'bullmq';
import {
  createLogger,
  createRedisConnection,
  disconnectPrisma,
  getPrisma,
  NOTIFICATION_QUEUE,
  NotificationJobData,
  SlackRepository,
} from '@reachinbox/shared';
import { NotifyOutcome, SlackNotifier } from './services/slack-notifier';

async function bootstrap(): Promise<void> {
  const logger = createLogger('notification-service');
  const connection = createRedisConnection();
  const notifier = new SlackNotifier(new SlackRepository(getPrisma()), logger);

  const worker = new Worker<NotificationJobData, NotifyOutcome>(
    NOTIFICATION_QUEUE,
    async (job: Job<NotificationJobData>) => {
      const outcome = await notifier.notifyRateLimit(job.data);
      logger.info({ userId: job.data.userId, scope: job.data.scope, outcome }, 'Rate-limit notification processed');
      return outcome;
    },
    { connection, concurrency: 5 },
  );

  worker.on('failed', (job, error) => logger.warn({ jobId: job?.id, err: error.message }, 'Notification failed'));
  worker.on('error', (error) => logger.error({ err: error }, 'Worker error'));
  logger.info('Notification service started');

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down notification service');
    await worker.close();
    await connection.quit().catch(() => undefined);
    await disconnectPrisma();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Notification service failed to start', error);
  process.exit(1);
});
