import { Queue } from 'bullmq';
import { EmailRepository, Logger, SendEmailJobData } from '@reachinbox/shared';

const PAGE_SIZE = 500;

/**
 * Safety net run once at startup (not a cron). Redis with AOF already keeps
 * delayed jobs across restarts; this repairs the edge cases where the DB row
 * exists but the job does not (e.g. Redis was flushed, or the API crashed
 * between committing the campaign and enqueueing). Job id = email id, so
 * re-adding an existing job is a no-op and nothing is ever sent twice.
 */
export class QueueReconciler {
  constructor(
    private readonly emails: EmailRepository,
    private readonly queue: Queue<SendEmailJobData>,
    private readonly logger: Logger,
  ) {}

  async run(): Promise<number> {
    let restored = 0;
    let cursor: string | undefined;

    for (;;) {
      const page = await this.emails.findPending(cursor, PAGE_SIZE);
      if (page.length === 0) break;

      const now = Date.now();
      const existing = await Promise.all(page.map((email) => this.queue.getJob(email.id)));
      const missing = page.filter((_, index) => !existing[index]);

      if (missing.length > 0) {
        await this.queue.addBulk(
          missing.map((email) => ({
            name: 'send-email',
            data: { emailId: email.id },
            opts: { jobId: email.id, delay: Math.max(0, email.scheduledAt.getTime() - now) },
          })),
        );
        restored += missing.length;
      }

      cursor = page[page.length - 1]!.id;
      if (page.length < PAGE_SIZE) break;
    }

    this.logger.info({ restored }, 'Queue reconciliation finished');
    return restored;
  }
}
