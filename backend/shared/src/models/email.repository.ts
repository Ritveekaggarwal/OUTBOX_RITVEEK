import { Prisma, PrismaClient, Email, EmailStatus, Sender, Campaign } from '@prisma/client';

export const SCHEDULED_STATUSES: EmailStatus[] = ['SCHEDULED', 'RATE_LIMITED', 'SENDING'];
export const SENT_STATUSES: EmailStatus[] = ['SENT', 'FAILED'];
const CLAIMABLE_STATUSES: EmailStatus[] = ['SCHEDULED', 'RATE_LIMITED'];
/** A SENDING row older than this is considered abandoned by a crashed worker. */
const STALE_LOCK_MS = 5 * 60 * 1000;
const INSERT_CHUNK = 1000;

export type EmailWithSender = Email & { sender: Pick<Sender, 'id' | 'email' | 'name'> };
export type EmailForSending = Email & { sender: Sender; campaign: Pick<Campaign, 'id' | 'hourlyLimit' | 'delayMs'> };

export interface NewCampaign {
  id: string;
  userId: string;
  senderId: string;
  subject: string;
  body: string;
  startAt: Date;
  delayMs: number;
  hourlyLimit: number;
  totalRecipients: number;
}

export interface ListEmailsParams {
  userId: string;
  statuses: EmailStatus[];
  orderBy: 'scheduledAt' | 'sentAt';
  limit: number;
  cursor?: string;
}

const senderSummary = { select: { id: true, email: true, name: true } } as const;

export class EmailRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createCampaignWithEmails(campaign: NewCampaign, emails: Prisma.EmailCreateManyInput[]): Promise<void> {
    await this.prisma.$transaction(
      async (tx) => {
        await tx.campaign.create({ data: campaign });
        for (let i = 0; i < emails.length; i += INSERT_CHUNK) {
          await tx.email.createMany({ data: emails.slice(i, i + INSERT_CHUNK) });
        }
      },
      { timeout: 60_000 },
    );
  }

  findById(id: string, userId: string): Promise<EmailWithSender | null> {
    return this.prisma.email.findFirst({ where: { id, userId }, include: { sender: senderSummary } });
  }

  findByIds(ids: string[], userId: string): Promise<EmailWithSender[]> {
    return this.prisma.email.findMany({ where: { id: { in: ids }, userId }, include: { sender: senderSummary } });
  }

  findForSending(id: string): Promise<EmailForSending | null> {
    return this.prisma.email.findUnique({
      where: { id },
      include: { sender: true, campaign: { select: { id: true, hourlyLimit: true, delayMs: true } } },
    });
  }

  async list(params: ListEmailsParams): Promise<{ items: EmailWithSender[]; nextCursor: string | null }> {
    const direction = params.orderBy === 'scheduledAt' ? 'asc' : 'desc';
    const items = await this.prisma.email.findMany({
      where: { userId: params.userId, status: { in: params.statuses } },
      include: { sender: senderSummary },
      orderBy: [{ [params.orderBy]: direction }, { id: 'asc' }],
      take: params.limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
    });
    const hasMore = items.length > params.limit;
    const page = hasMore ? items.slice(0, params.limit) : items;
    return { items: page, nextCursor: hasMore ? page[page.length - 1]!.id : null };
  }

  /** Postgres fallback for search when Elasticsearch is unavailable. */
  searchFallback(userId: string, text: string, statuses: EmailStatus[], limit: number): Promise<EmailWithSender[]> {
    return this.prisma.email.findMany({
      where: {
        userId,
        status: { in: statuses },
        OR: [
          { subject: { contains: text, mode: 'insensitive' } },
          { recipient: { contains: text, mode: 'insensitive' } },
          { body: { contains: text, mode: 'insensitive' } },
        ],
      },
      include: { sender: senderSummary },
      orderBy: { scheduledAt: 'desc' },
      take: limit,
    });
  }

  async countByStatus(userId: string): Promise<Record<EmailStatus, number>> {
    const rows = await this.prisma.email.groupBy({ by: ['status'], where: { userId }, _count: { _all: true } });
    const result = { SCHEDULED: 0, RATE_LIMITED: 0, SENDING: 0, SENT: 0, FAILED: 0, CANCELLED: 0 };
    for (const row of rows) result[row.status] = row._count._all;
    return result;
  }

  /**
   * Idempotency guard: only one worker can move an email into SENDING.
   * Returns false when the email was already sent, cancelled or is being sent.
   */
  async claimForSending(id: string): Promise<boolean> {
    const staleBefore = new Date(Date.now() - STALE_LOCK_MS);
    const result = await this.prisma.email.updateMany({
      where: {
        id,
        OR: [{ status: { in: CLAIMABLE_STATUSES } }, { status: 'SENDING', lockedAt: { lt: staleBefore } }],
      },
      data: { status: 'SENDING', lockedAt: new Date(), attempts: { increment: 1 } },
    });
    return result.count === 1;
  }

  /** lockedAt is kept as the moment the send started (useful to audit throttling). */
  markSent(id: string, data: { messageId: string; previewUrl: string | null }): Promise<Email> {
    return this.prisma.email.update({
      where: { id },
      data: { status: 'SENT', sentAt: new Date(), failedReason: null, ...data },
    });
  }

  markFailed(id: string, reason: string): Promise<Email> {
    return this.prisma.email.update({
      where: { id },
      data: { status: 'FAILED', sentAt: new Date(), failedReason: reason.slice(0, 500) },
    });
  }

  releaseForRetry(id: string, reason: string): Promise<Email> {
    return this.prisma.email.update({
      where: { id },
      data: { status: 'SCHEDULED', lockedAt: null, failedReason: reason.slice(0, 500) },
    });
  }

  markRateLimited(id: string, rescheduledAt: Date): Promise<Email> {
    return this.prisma.email.update({ where: { id }, data: { status: 'RATE_LIMITED', scheduledAt: rescheduledAt } });
  }

  async cancel(id: string, userId: string): Promise<boolean> {
    const result = await this.prisma.email.updateMany({
      where: { id, userId, status: { in: CLAIMABLE_STATUSES } },
      data: { status: 'CANCELLED' },
    });
    return result.count === 1;
  }

  async setStarred(id: string, userId: string, starred: boolean): Promise<boolean> {
    const result = await this.prisma.email.updateMany({ where: { id, userId }, data: { starred } });
    return result.count === 1;
  }

  /** Keyset-paginated scan of emails that still need a queue job (used on startup). */
  findPending(afterId: string | undefined, take: number): Promise<Pick<Email, 'id' | 'scheduledAt'>[]> {
    return this.prisma.email.findMany({
      where: { status: { in: [...CLAIMABLE_STATUSES, 'SENDING'] } },
      select: { id: true, scheduledAt: true },
      orderBy: { id: 'asc' },
      take,
      ...(afterId ? { cursor: { id: afterId }, skip: 1 } : {}),
    });
  }
}
