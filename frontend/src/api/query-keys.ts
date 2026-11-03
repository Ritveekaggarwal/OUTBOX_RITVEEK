import type { EmailStatus, Folder } from '../types/api';

export const queryKeys = {
  me: ['me'] as const,
  senders: ['senders'] as const,
  slack: ['slack'] as const,
  stats: ['emails', 'stats'] as const,
  emails: (folder: Folder, q: string, status?: EmailStatus) => ['emails', 'list', folder, q, status ?? 'all'] as const,
  emailLists: ['emails', 'list'] as const,
  email: (id: string) => ['emails', 'detail', id] as const,
};
