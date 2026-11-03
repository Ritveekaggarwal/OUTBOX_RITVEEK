import { DelayedError, Job, Queue } from 'bullmq';
import {
  EmailForSending,
  EmailRepository,
  EmailSearchIndex,
  env,
  HourlyRateLimiter,
  Logger,
  NotificationJobData,
  QuotaScope,
  SendEmailJobData,
} from '@reachinbox/shared';
import { Mailer } from '../services/mailer.service';

export interface SendEmailResult {
  outcome: 'sent' | 'skipped' | 'rate-limited';
  reason?: string;
}

/**
 * Processes one email job:
 *   1. skip if the email no longer needs sending (idempotency),
 *   2. atomically consume hourly quota (global, per sender, per campaign),
 *      otherwise move the job into the next hour window and alert Slack once,
 *   3. claim the row (SCHEDULED -> SENDING) so no other worker can send it,
 *   4. send over SMTP and record the result.
 */
export class SendEmailProcessor {
  constructor(
    private readonly emails: EmailRepository,
    private readonly limiter: HourlyRateLimiter,
    private readonly mailer: Mailer,
    private readonly search: EmailSearchIndex,
    private readonly notifications: Queue<NotificationJobData>,
    private readonly logger: Logger,
  ) {}

  process = async (job: Job<SendEmailJobData>, token?: string): Promise<SendEmailResult> => {
    const email = await this.emails.findForSending(job.data.emailId);
    if (!email) return { outcome: 'skipped', reason: 'email not found' };
    if (email.status === 'SENT' || email.status === 'CANCELLED' || email.status === 'FAILED') {
      return { outcome: 'skipped', reason: `already ${email.status.toLowerCase()}` };
    }

    const decision = await this.limiter.tryConsume(this.scopesFor(email));
    if (!decision.allowed) {
      await this.deferToNextWindow(job, token, email, decision.exceeded, decision.windowStart, decision.nextWindowStart);
      throw new DelayedError();
    }

    if (!(await this.emails.claimForSending(email.id))) {
      return { outcome: 'skipped', reason: 'claimed by another worker or already processed' };
    }

    try {
      const receipt = await this.mailer.send(email.sender, {
        to: email.recipient,
        subject: email.subject,
        html: email.body,
        messageId: `<${email.id}@reachinbox.local>`,
      });
      const sent = await this.emails.markSent(email.id, receipt);
      void this.search.updateStatus(email.id, { status: 'SENT', sentAt: sent.sentAt?.toISOString() ?? null });
      this.logger.info({ emailId: email.id, to: email.recipient, preview: receipt.previewUrl }, 'Email sent');
      return { outcome: 'sent' };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      const isLastAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
      if (isLastAttempt) {
        await this.emails.markFailed(email.id, reason);
        void this.search.updateStatus(email.id, { status: 'FAILED', sentAt: new Date().toISOString() });
        this.logger.error({ emailId: email.id, reason }, 'Email permanently failed');
      } else {
        await this.emails.releaseForRetry(email.id, reason);
        this.logger.warn({ emailId: email.id, reason, attempt: job.attemptsMade + 1 }, 'Send failed, will retry');
      }
      throw error;
    }
  };

  private scopesFor(email: EmailForSending): QuotaScope[] {
    return [
      { type: 'global', id: 'all', limit: env.MAX_EMAILS_PER_HOUR },
      { type: 'sender', id: email.senderId, limit: env.MAX_EMAILS_PER_HOUR_PER_SENDER },
      { type: 'campaign', id: email.campaignId, limit: email.campaign.hourlyLimit },
    ];
  }

  /**
   * Never drops a job: it is moved (not failed) into the next hour window.
   * Slots are handed out FIFO per scope so original order is preserved, spaced
   * by the larger of the provider throttle and the campaign delay.
   */
  private async deferToNextWindow(
    job: Job<SendEmailJobData>,
    token: string | undefined,
    email: EmailForSending,
    exceeded: QuotaScope,
    windowStart: number,
    nextWindowStart: number,
  ): Promise<void> {
    const spacing = Math.max(env.MIN_DELAY_BETWEEN_EMAILS_MS, email.campaign.delayMs);
    const runAt = await this.limiter.reserveNextWindowSlot(`${exceeded.type}:${exceeded.id}`, nextWindowStart, spacing);

    await this.emails.markRateLimited(email.id, new Date(runAt));
    void this.search.updateStatus(email.id, { status: 'RATE_LIMITED', scheduledAt: new Date(runAt).toISOString() });
    await job.moveToDelayed(runAt, token);

    this.logger.info(
      { emailId: email.id, scope: exceeded.type, limit: exceeded.limit, runAt: new Date(runAt).toISOString() },
      'Hourly limit reached, job deferred to next window',
    );

    const alertKey = `${email.userId}:${exceeded.type}:${exceeded.id}:${HourlyRateLimiter.windowOf(windowStart)}`;
    if (await this.limiter.markOnce(alertKey)) {
      await this.notifications.add(
        'rate-limit-reached',
        {
          type: 'RATE_LIMIT_REACHED',
          userId: email.userId,
          scope: exceeded.type,
          senderEmail: email.sender.email,
          limit: exceeded.limit,
          windowStart: new Date(windowStart).toISOString(),
          resumesAt: new Date(nextWindowStart).toISOString(),
        },
        { jobId: `rate-limit:${alertKey}` },
      );
    }
  }
}
