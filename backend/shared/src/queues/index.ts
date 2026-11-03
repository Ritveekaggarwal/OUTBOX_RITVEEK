import { Queue, JobsOptions } from 'bullmq';
import { Redis } from 'ioredis';
import { env } from '../config/env';

export const EMAIL_QUEUE = 'email-send';
export const NOTIFICATION_QUEUE = 'notifications';

export interface SendEmailJobData {
  emailId: string;
}

export interface RateLimitNotificationJobData {
  type: 'RATE_LIMIT_REACHED';
  userId: string;
  scope: 'global' | 'sender' | 'campaign';
  senderEmail: string;
  limit: number;
  windowStart: string;
  resumesAt: string;
}

export type NotificationJobData = RateLimitNotificationJobData;

export const emailJobOptions = (): JobsOptions => ({
  attempts: env.EMAIL_MAX_ATTEMPTS,
  backoff: { type: 'exponential', delay: 5_000 },
  removeOnComplete: { age: 24 * 3600, count: 10_000 },
  removeOnFail: { age: 7 * 24 * 3600 },
});

export const notificationJobOptions = (): JobsOptions => ({
  attempts: 5,
  backoff: { type: 'exponential', delay: 3_000 },
  removeOnComplete: { age: 24 * 3600, count: 1_000 },
  removeOnFail: { age: 7 * 24 * 3600 },
});

export function createEmailQueue(connection: Redis): Queue<SendEmailJobData> {
  return new Queue<SendEmailJobData>(EMAIL_QUEUE, { connection, defaultJobOptions: emailJobOptions() });
}

export function createNotificationQueue(connection: Redis): Queue<NotificationJobData> {
  return new Queue<NotificationJobData>(NOTIFICATION_QUEUE, {
    connection,
    defaultJobOptions: notificationJobOptions(),
  });
}
