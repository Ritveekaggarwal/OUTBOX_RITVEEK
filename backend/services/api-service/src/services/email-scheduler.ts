import { Queue } from 'bullmq';
import { SendEmailJobData } from '@reachinbox/shared';

export interface ScheduledEmailRef {
  id: string;
  scheduledAt: Date;
}

/** Abstraction over the job queue so services do not depend on BullMQ directly. */
export interface EmailScheduler {
  scheduleMany(emails: ScheduledEmailRef[]): Promise<void>;
  cancel(emailId: string): Promise<void>;
}

const BULK_CHUNK = 500;

/**
 * Uses BullMQ delayed jobs (no cron). The job id is the email id, so adding
 * the same email twice is a no-op, which keeps scheduling idempotent.
 */
export class BullMqEmailScheduler implements EmailScheduler {
  constructor(private readonly queue: Queue<SendEmailJobData>) {}

  async scheduleMany(emails: ScheduledEmailRef[]): Promise<void> {
    const now = Date.now();
    for (let i = 0; i < emails.length; i += BULK_CHUNK) {
      const chunk = emails.slice(i, i + BULK_CHUNK);
      await this.queue.addBulk(
        chunk.map((email) => ({
          name: 'send-email',
          data: { emailId: email.id },
          opts: { jobId: email.id, delay: Math.max(0, email.scheduledAt.getTime() - now) },
        })),
      );
    }
  }

  async cancel(emailId: string): Promise<void> {
    const job = await this.queue.getJob(emailId);
    if (!job) return;
    try {
      await job.remove();
    } catch {
      // Job is locked by a worker; the worker skips it because the DB row is CANCELLED.
    }
  }
}
