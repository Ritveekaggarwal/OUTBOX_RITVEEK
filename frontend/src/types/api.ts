export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

export interface Sender {
  id: string;
  email: string;
  name: string;
}

export type EmailStatus = 'SCHEDULED' | 'RATE_LIMITED' | 'SENDING' | 'SENT' | 'FAILED' | 'CANCELLED';

export type Folder = 'scheduled' | 'sent';

export interface EmailSummary {
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
  sender: Sender;
}

export interface EmailDetail extends EmailSummary {
  body: string;
  messageId: string | null;
}

export interface EmailPage {
  items: EmailSummary[];
  nextCursor: string | null;
}

export interface EmailStats {
  scheduled: number;
  sent: number;
  failed: number;
  rateLimited: number;
}

export interface ScheduleRequest {
  senderId: string;
  subject: string;
  body: string;
  recipients: string[];
  startAt: string;
  delayBetweenEmailsSeconds: number;
  hourlyLimit: number;
}

export interface ScheduleResult {
  campaignId: string;
  scheduledCount: number;
  duplicatesRemoved: number;
  firstSendAt: string;
  lastSendAt: string;
}

export interface SlackStatus {
  configured: boolean;
  connected: boolean;
  teamName?: string;
  channel?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}
