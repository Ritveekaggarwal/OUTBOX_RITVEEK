import {
  createEmailQueue,
  createLogger,
  createNotificationQueue,
  createRedisConnection,
  EmailRepository,
  EmailSearchIndex,
  getPrisma,
  getRedis,
  SenderRepository,
  SlackRepository,
  UserRepository,
} from '@reachinbox/shared';
import { AuthController } from './controllers/auth.controller';
import { EmailController } from './controllers/email.controller';
import { HealthController } from './controllers/health.controller';
import { SenderController } from './controllers/sender.controller';
import { SlackController } from './controllers/slack.controller';
import { AuthService } from './services/auth.service';
import { CampaignService } from './services/campaign.service';
import { BullMqEmailScheduler } from './services/email-scheduler';
import { EmailService } from './services/email.service';
import { GoogleOAuthService } from './services/google-oauth.service';
import { SenderService } from './services/sender.service';
import { SlackService } from './services/slack.service';
import { TokenService } from './services/token.service';

/** Composition root: the only place where concrete implementations are wired together. */
export function createContainer() {
  const logger = createLogger('api-service');
  const prisma = getPrisma();
  const redis = getRedis();
  const queueConnection = createRedisConnection();

  const emailQueue = createEmailQueue(queueConnection);
  const notificationQueue = createNotificationQueue(queueConnection);

  const users = new UserRepository(prisma);
  const emails = new EmailRepository(prisma);
  const senders = new SenderRepository(prisma);
  const slack = new SlackRepository(prisma);
  const search = new EmailSearchIndex(logger);

  const tokens = new TokenService();
  const scheduler = new BullMqEmailScheduler(emailQueue);
  const authService = new AuthService(users, tokens);
  const googleService = new GoogleOAuthService(users);
  const senderService = new SenderService(senders, logger);
  const campaignService = new CampaignService(emails, senders, scheduler, search);
  const emailService = new EmailService(emails, search, scheduler, logger);
  const slackService = new SlackService(slack, tokens);

  return {
    logger,
    prisma,
    redis,
    queueConnection,
    queues: { emailQueue, notificationQueue },
    search,
    tokens,
    senderService,
    controllers: {
      auth: new AuthController(authService, googleService, tokens),
      emails: new EmailController(emailService, campaignService),
      senders: new SenderController(senderService),
      slack: new SlackController(slackService),
      health: new HealthController(prisma, redis),
    },
  };
}

export type Container = ReturnType<typeof createContainer>;
