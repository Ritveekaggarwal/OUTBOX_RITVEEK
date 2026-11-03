import { Client } from '@elastic/elasticsearch';
import type { Email, EmailStatus } from '@prisma/client';
import type { Logger } from 'pino';
import { env } from '../config/env';

export interface EmailSearchDocument {
  id: string;
  userId: string;
  campaignId: string;
  recipient: string;
  subject: string;
  body: string;
  status: EmailStatus;
  senderEmail?: string;
  scheduledAt: string;
  sentAt: string | null;
  createdAt: string;
}

export interface EmailSearchQuery {
  userId: string;
  text: string;
  statuses?: EmailStatus[];
  from?: number;
  size?: number;
}

export interface EmailSearchResult {
  ids: string[];
  total: number;
}

const stripHtml = (html: string): string => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

export type IndexableEmail = Pick<
  Email,
  'id' | 'userId' | 'campaignId' | 'recipient' | 'subject' | 'body' | 'status' | 'scheduledAt' | 'sentAt' | 'createdAt'
>;

export function toSearchDocument(email: IndexableEmail, senderEmail?: string): EmailSearchDocument {
  return {
    id: email.id,
    userId: email.userId,
    campaignId: email.campaignId,
    recipient: email.recipient,
    subject: email.subject,
    body: stripHtml(email.body),
    status: email.status,
    senderEmail,
    scheduledAt: email.scheduledAt.toISOString(),
    sentAt: email.sentAt ? email.sentAt.toISOString() : null,
    createdAt: email.createdAt.toISOString(),
  };
}

/**
 * Elasticsearch read model for emails. Writes are best-effort: Postgres is the
 * source of truth, so an indexing failure is logged and never breaks sending.
 */
export class EmailSearchIndex {
  private readonly client: Client;
  private readonly index = env.ELASTICSEARCH_INDEX;

  constructor(private readonly logger: Logger) {
    this.client = new Client({ node: env.ELASTICSEARCH_URL });
  }

  async ensureIndex(): Promise<void> {
    try {
      const exists = await this.client.indices.exists({ index: this.index });
      if (exists) return;
      await this.client.indices.create({
        index: this.index,
        mappings: {
          properties: {
            id: { type: 'keyword' },
            userId: { type: 'keyword' },
            campaignId: { type: 'keyword' },
            recipient: { type: 'text', fields: { keyword: { type: 'keyword' } } },
            subject: { type: 'text' },
            body: { type: 'text' },
            status: { type: 'keyword' },
            senderEmail: { type: 'keyword' },
            scheduledAt: { type: 'date' },
            sentAt: { type: 'date' },
            createdAt: { type: 'date' },
          },
        },
      });
      this.logger.info({ index: this.index }, 'Elasticsearch index created');
    } catch (error) {
      this.logger.warn({ err: error }, 'Elasticsearch unavailable, search will fall back to Postgres');
    }
  }

  async indexMany(documents: EmailSearchDocument[]): Promise<void> {
    if (documents.length === 0) return;
    try {
      const operations = documents.flatMap((doc) => [{ index: { _index: this.index, _id: doc.id } }, doc]);
      const response = await this.client.bulk({ operations, refresh: false });
      if (response.errors) this.logger.warn('Some emails failed to index in Elasticsearch');
    } catch (error) {
      this.logger.warn({ err: error }, 'Bulk indexing failed');
    }
  }

  async updateStatus(id: string, patch: Partial<EmailSearchDocument>): Promise<void> {
    try {
      await this.client.update({ index: this.index, id, doc: patch, retry_on_conflict: 3 });
    } catch (error) {
      this.logger.warn({ err: error, id }, 'Failed to update email in Elasticsearch');
    }
  }

  async search(query: EmailSearchQuery): Promise<EmailSearchResult> {
    const filter: object[] = [{ term: { userId: query.userId } }];
    if (query.statuses?.length) filter.push({ terms: { status: query.statuses } });

    const response = await this.client.search<EmailSearchDocument>({
      index: this.index,
      from: query.from ?? 0,
      size: query.size ?? 20,
      query: {
        bool: {
          filter,
          must: [
            {
              multi_match: {
                query: query.text,
                fields: ['subject^3', 'recipient^2', 'body'],
                type: 'bool_prefix',
                fuzziness: 'AUTO',
              },
            },
          ],
        },
      },
      sort: [{ _score: { order: 'desc' } }, { scheduledAt: { order: 'desc' } }],
      _source: false,
    });

    const total = typeof response.hits.total === 'number' ? response.hits.total : (response.hits.total?.value ?? 0);
    return { ids: response.hits.hits.map((hit) => hit._id!).filter(Boolean), total };
  }
}
