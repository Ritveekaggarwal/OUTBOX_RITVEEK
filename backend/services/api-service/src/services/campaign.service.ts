import crypto from 'node:crypto';
import {
  EmailRepository,
  EmailSearchIndex,
  Prisma,
  SenderRepository,
  toSearchDocument,
} from '@reachinbox/shared';
import { AppError } from '../utils/app-error';
import { ScheduleCampaignInput } from '../validators/schemas';
import { EmailScheduler } from './email-scheduler';

export interface ScheduleCampaignResult {
  campaignId: string;
  scheduledCount: number;
  duplicatesRemoved: number;
  firstSendAt: string;
  lastSendAt: string;
}

export class CampaignService {
  constructor(
    private readonly emails: EmailRepository,
    private readonly senders: SenderRepository,
    private readonly scheduler: EmailScheduler,
    private readonly search: EmailSearchIndex,
  ) {}

  /**
   * Persists the campaign and one email row per unique recipient, then creates
   * a delayed job per email. Send time = startAt + index * delay, so the
   * requested spacing between emails is respected from the start; hourly
   * limits are enforced again by the worker at send time.
   */
  async schedule(userId: string, input: ScheduleCampaignInput): Promise<ScheduleCampaignResult> {
    const sender = await this.senders.findActiveById(input.senderId);
    if (!sender) throw AppError.badRequest('Selected sender does not exist');

    const recipients = [...new Set(input.recipients)];
    const startAt = new Date(Math.max(input.startAt.getTime(), Date.now()));
    const delayMs = input.delayBetweenEmailsSeconds * 1000;
    const campaignId = crypto.randomUUID();
    const now = new Date();

    const rows = recipients.map((recipient, index) => ({
      id: crypto.randomUUID(),
      campaignId,
      userId,
      senderId: sender.id,
      recipient,
      subject: input.subject,
      body: input.body,
      sequence: index,
      scheduledAt: new Date(startAt.getTime() + index * delayMs),
      status: 'SCHEDULED' as const,
      sentAt: null,
      createdAt: now,
      updatedAt: now,
    })) satisfies Prisma.EmailCreateManyInput[];

    await this.emails.createCampaignWithEmails(
      {
        id: campaignId,
        userId,
        senderId: sender.id,
        subject: input.subject,
        body: input.body,
        startAt,
        delayMs,
        hourlyLimit: input.hourlyLimit,
        totalRecipients: rows.length,
      },
      rows,
    );

    await this.scheduler.scheduleMany(rows);

    // Search indexing is a read model: fire-and-forget so it never slows scheduling.
    void this.search.indexMany(rows.map((row) => toSearchDocument(row, sender.email)));

    return {
      campaignId,
      scheduledCount: rows.length,
      duplicatesRemoved: input.recipients.length - recipients.length,
      firstSendAt: rows[0]!.scheduledAt.toISOString(),
      lastSendAt: rows[rows.length - 1]!.scheduledAt.toISOString(),
    };
  }
}
