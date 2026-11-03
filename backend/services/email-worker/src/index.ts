import { Worker } from 'bullmq';
import {
  createEmailQueue,
  createLogger,
  createNotificationQueue,
  createRedisConnection,
  disconnectPrisma,
  disconnectRedis,
  EMAIL_QUEUE,
  EmailRepository,
  EmailSearchIndex,
  env,
  getPrisma,
  getRedis,
  HourlyRateLimiter,
  SendEmailJobData,
} from '@reachinbox/shared';
import { SendEmailProcessor, SendEmailResult } from './processors/send-email.processor';
import { SmtpMailer } from './services/mailer.service';
import { QueueReconciler } from './services/queue-reconciler';

async function bootstrap(): Promise<void> {
  const logger = createLogger('email-worker');
  const prisma = getPrisma();
  const queueConnection = createRedisConnection();
  const workerConnection = createRedisConnection();

  const emailQueue = createEmailQueue(queueConnection);
  const notificationQueue = createNotificationQueue(queueConnection);
  const emails = new EmailRepository(prisma);
  const search = new EmailSearchIndex(logger);
  const mailer = new SmtpMailer();
  const processor = new SendEmailProcessor(
    emails,
    new HourlyRateLimiter(getRedis()),
    mailer,
    search,
    notificationQueue,
    logger,
  );

  await new QueueReconciler(emails, emailQueue, logger).run();

  const worker = new Worker<SendEmailJobData, SendEmailResult>(EMAIL_QUEUE, processor.process, {
    connection: workerConnection,
    concurrency: env.WORKER_CONCURRENCY,
    // Redis-backed limiter shared by every worker instance: at most one send
    // per MIN_DELAY_BETWEEN_EMAILS_MS across the whole cluster (provider throttling).
    ...(env.MIN_DELAY_BETWEEN_EMAILS_MS > 0
      ? { limiter: { max: 1, duration: env.MIN_DELAY_BETWEEN_EMAILS_MS } }
      : {}),
  });

  worker.on('failed', (job, error) => {
    logger.warn({ jobId: job?.id, attempts: job?.attemptsMade, err: error.message }, 'Job failed');
  });
  worker.on('error', (error) => logger.error({ err: error }, 'Worker error'));

  logger.info(
    {
      concurrency: env.WORKER_CONCURRENCY,
      minDelayMs: env.MIN_DELAY_BETWEEN_EMAILS_MS,
      maxPerHour: env.MAX_EMAILS_PER_HOUR,
      maxPerHourPerSender: env.MAX_EMAILS_PER_HOUR_PER_SENDER,
    },
    'Email worker started',
  );

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down email worker (finishing active jobs)');
    await worker.close();
    await Promise.allSettled([emailQueue.close(), notificationQueue.close()]);
    mailer.close();
    await Promise.allSettled([queueConnection.quit(), workerConnection.quit()]);
    await disconnectRedis();
    await disconnectPrisma();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Email worker failed to start', error);
  process.exit(1);
});
