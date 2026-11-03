import { z } from 'zod';
import { env } from '@reachinbox/shared';

const email = z.string().trim().toLowerCase().email('Invalid email address').max(254);

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email,
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(/[A-Za-z]/, 'Password must contain a letter')
    .regex(/\d/, 'Password must contain a number'),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required').max(128),
});

export const scheduleCampaignSchema = z
  .object({
    senderId: z.string().uuid('Select a sender'),
    subject: z.string().trim().min(1, 'Subject is required').max(255),
    body: z.string().trim().min(1, 'Email body is required').max(100_000),
    recipients: z
      .array(email)
      .min(1, 'Add at least one recipient')
      .max(env.MAX_RECIPIENTS_PER_CAMPAIGN, `At most ${env.MAX_RECIPIENTS_PER_CAMPAIGN} recipients per campaign`),
    startAt: z.coerce.date(),
    delayBetweenEmailsSeconds: z.coerce.number().int().min(0).max(86_400).default(0),
    hourlyLimit: z.coerce.number().int().min(1).max(100_000),
  })
  .refine((value) => value.startAt.getTime() > Date.now() - 60_000, {
    message: 'Start time cannot be in the past',
    path: ['startAt'],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ScheduleCampaignInput = z.infer<typeof scheduleCampaignSchema>;

export const listEmailsQuerySchema = z.object({
  folder: z.enum(['scheduled', 'sent']).default('scheduled'),
  q: z.string().trim().max(200).optional(),
  status: z.enum(['SCHEDULED', 'RATE_LIMITED', 'SENDING', 'SENT', 'FAILED']).optional(),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export type ListEmailsQuery = z.infer<typeof listEmailsQuerySchema>;

export const idParamSchema = z.object({ id: z.string().uuid('Invalid id') });

export const starSchema = z.object({ starred: z.boolean() });
