import {
  EmailRepository,
  EmailSearchIndex,
  EmailStatus,
  EmailWithSender,
  Logger,
  SCHEDULED_STATUSES,
  SENT_STATUSES,
} from '@reachinbox/shared';
import { AppError } from '../utils/app-error';
import { ListEmailsQuery } from '../validators/schemas';
import { EmailScheduler } from './email-scheduler';

export interface EmailSummaryDto {
  id: string;
  campaignId: string;
  recipient: string;
  subject: string;
  preview: string;
  status: EmailStatus;
  scheduledAt: string;
  sentAt: string | null;
  failedReason: string | null;
  previewUrl: string | null;
  starred: boolean;
  attempts: number;
  sender: { id: string; email: string; name: string };
}

export interface EmailDetailDto extends EmailSummaryDto {
  body: string;
  messageId: string | null;
}

export interface EmailPage {
  items: EmailSummaryDto[];
  nextCursor: string | null;
}

export interface EmailStats {
  scheduled: number;
  sent: number;
  failed: number;
  rateLimited: number;
}

const toPlainText = (html: string): string =>
  html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const toSummary = (email: EmailWithSender): EmailSummaryDto => ({
  id: email.id,
  campaignId: email.campaignId,
  recipient: email.recipient,
  subject: email.subject,
  preview: toPlainText(email.body).slice(0, 160),
  status: email.status,
  scheduledAt: email.scheduledAt.toISOString(),
  sentAt: email.sentAt?.toISOString() ?? null,
  failedReason: email.failedReason,
  previewUrl: email.previewUrl,
  starred: email.starred,
  attempts: email.attempts,
  sender: email.sender,
});

export class EmailService {
  constructor(
    private readonly emails: EmailRepository,
    private readonly search: EmailSearchIndex,
    private readonly scheduler: EmailScheduler,
    private readonly logger: Logger,
  ) {}

  async list(userId: string, query: ListEmailsQuery): Promise<EmailPage> {
    const folderStatuses = query.folder === 'scheduled' ? SCHEDULED_STATUSES : SENT_STATUSES;
    const statuses = query.status ? folderStatuses.filter((status) => status === query.status) : folderStatuses;
    if (statuses.length === 0) return { items: [], nextCursor: null };

    if (query.q) {
      return { items: await this.searchEmails(userId, query.q, statuses, query.limit), nextCursor: null };
    }

    const page = await this.emails.list({
      userId,
      statuses,
      orderBy: query.folder === 'scheduled' ? 'scheduledAt' : 'sentAt',
      limit: query.limit,
      cursor: query.cursor,
    });
    return { items: page.items.map(toSummary), nextCursor: page.nextCursor };
  }

  /** Full-text search through Elasticsearch, falling back to Postgres if ES is down. */
  private async searchEmails(
    userId: string,
    text: string,
    statuses: EmailStatus[],
    limit: number,
  ): Promise<EmailSummaryDto[]> {
    try {
      const result = await this.search.search({ userId, text, statuses, size: limit });
      if (result.ids.length === 0) return [];
      const rows = await this.emails.findByIds(result.ids, userId);
      const byId = new Map(rows.map((row) => [row.id, row]));
      // Keep relevance order; DB status is authoritative over the index.
      return result.ids
        .map((id) => byId.get(id))
        .filter((row): row is EmailWithSender => Boolean(row && statuses.includes(row.status)))
        .map(toSummary);
    } catch (error) {
      this.logger.warn({ err: error }, 'Elasticsearch search failed, using Postgres fallback');
      const rows = await this.emails.searchFallback(userId, text, statuses, limit);
      return rows.map(toSummary);
    }
  }

  async getById(userId: string, id: string): Promise<EmailDetailDto> {
    const email = await this.emails.findById(id, userId);
    if (!email) throw AppError.notFound('Email not found');
    return { ...toSummary(email), body: email.body, messageId: email.messageId };
  }

  async stats(userId: string): Promise<EmailStats> {
    const counts = await this.emails.countByStatus(userId);
    return {
      scheduled: counts.SCHEDULED + counts.RATE_LIMITED + counts.SENDING,
      sent: counts.SENT + counts.FAILED,
      failed: counts.FAILED,
      rateLimited: counts.RATE_LIMITED,
    };
  }

  async setStarred(userId: string, id: string, starred: boolean): Promise<void> {
    const updated = await this.emails.setStarred(id, userId, starred);
    if (!updated) throw AppError.notFound('Email not found');
  }

  async cancel(userId: string, id: string): Promise<void> {
    const cancelled = await this.emails.cancel(id, userId);
    if (!cancelled) throw AppError.conflict('Only scheduled emails that have not started sending can be cancelled');
    await this.scheduler.cancel(id);
    void this.search.updateStatus(id, { status: 'CANCELLED' });
  }
}
