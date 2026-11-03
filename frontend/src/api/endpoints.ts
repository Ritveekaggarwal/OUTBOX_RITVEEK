import type {
  AuthResponse,
  EmailDetail,
  EmailPage,
  EmailStats,
  EmailStatus,
  Folder,
  ScheduleRequest,
  ScheduleResult,
  Sender,
  SlackStatus,
  User,
} from '../types/api';
import { request } from './http';

export const authApi = {
  me: () => request<{ user: User }>('/auth/me').then((res) => res.user),
  login: (body: { email: string; password: string }) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body }),
  register: (body: { name: string; email: string; password: string }) =>
    request<AuthResponse>('/auth/register', { method: 'POST', body }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  googleUrl: '/api/auth/google',
};

export interface ListEmailsParams {
  folder: Folder;
  q?: string;
  status?: EmailStatus;
  cursor?: string;
  limit?: number;
}

export const emailsApi = {
  list: (params: ListEmailsParams, signal?: AbortSignal) =>
    request<EmailPage>('/emails', { query: { ...params }, signal }),
  stats: () => request<EmailStats>('/emails/stats'),
  get: (id: string) => request<EmailDetail>(`/emails/${id}`),
  schedule: (body: ScheduleRequest) => request<ScheduleResult>('/emails/schedule', { method: 'POST', body }),
  setStarred: (id: string, starred: boolean) =>
    request<void>(`/emails/${id}/star`, { method: 'PATCH', body: { starred } }),
  cancel: (id: string) => request<void>(`/emails/${id}`, { method: 'DELETE' }),
};

export const sendersApi = {
  list: () => request<{ items: Sender[] }>('/senders').then((res) => res.items),
};

export const slackApi = {
  status: () => request<SlackStatus>('/slack/status'),
  connect: () => request<{ url: string }>('/slack/connect', { method: 'POST' }),
  test: () => request<void>('/slack/test', { method: 'POST' }),
  disconnect: () => request<void>('/slack', { method: 'DELETE' }),
};
