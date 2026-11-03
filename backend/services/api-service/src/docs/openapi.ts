import { env } from '@reachinbox/shared';

const errorResponse = {
  description: 'Error',
  content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
};

const idParam = { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } };

export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'ReachInbox Email Scheduler API',
    version: '1.0.0',
    description:
      'Schedules emails with BullMQ delayed jobs, sends them through Ethereal SMTP with per-sender / per-campaign ' +
      'hourly rate limits, and notifies Slack when a limit is reached.\n\n' +
      'Authenticate with `POST /auth/login` (or Google OAuth in the browser), then click **Authorize** and paste the ' +
      '`token` from the response. The queue dashboard lives at `/admin/queues` (HTTP basic auth).',
  },
  servers: [{ url: `${env.API_BASE_URL}/api` }],
  tags: [
    { name: 'Auth' },
    { name: 'Emails' },
    { name: 'Senders' },
    { name: 'Slack' },
    { name: 'System' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      cookieAuth: { type: 'apiKey', in: 'cookie', name: 'rb_session' },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              message: { type: 'string' },
              details: {},
            },
          },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          name: { type: 'string' },
          avatarUrl: { type: 'string', nullable: true },
        },
      },
      AuthResult: {
        type: 'object',
        properties: { user: { $ref: '#/components/schemas/User' }, token: { type: 'string' } },
      },
      Sender: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string' },
          name: { type: 'string' },
        },
      },
      EmailStatus: {
        type: 'string',
        enum: ['SCHEDULED', 'RATE_LIMITED', 'SENDING', 'SENT', 'FAILED', 'CANCELLED'],
      },
      EmailSummary: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          campaignId: { type: 'string', format: 'uuid' },
          recipient: { type: 'string' },
          subject: { type: 'string' },
          preview: { type: 'string' },
          status: { $ref: '#/components/schemas/EmailStatus' },
          scheduledAt: { type: 'string', format: 'date-time' },
          sentAt: { type: 'string', format: 'date-time', nullable: true },
          failedReason: { type: 'string', nullable: true },
          previewUrl: { type: 'string', nullable: true, description: 'Ethereal web preview of the sent message' },
          starred: { type: 'boolean' },
          attempts: { type: 'integer' },
          sender: { $ref: '#/components/schemas/Sender' },
        },
      },
      EmailDetail: {
        allOf: [
          { $ref: '#/components/schemas/EmailSummary' },
          { type: 'object', properties: { body: { type: 'string' }, messageId: { type: 'string', nullable: true } } },
        ],
      },
      ScheduleRequest: {
        type: 'object',
        required: ['senderId', 'subject', 'body', 'recipients', 'startAt', 'hourlyLimit'],
        properties: {
          senderId: { type: 'string', format: 'uuid' },
          subject: { type: 'string', example: 'Meeting follow-up' },
          body: { type: 'string', example: '<p>Hi there, just following up on our meeting.</p>' },
          recipients: {
            type: 'array',
            items: { type: 'string', format: 'email' },
            example: ['john@example.com', 'olive@example.com'],
          },
          startAt: { type: 'string', format: 'date-time' },
          delayBetweenEmailsSeconds: { type: 'integer', minimum: 0, example: 2 },
          hourlyLimit: { type: 'integer', minimum: 1, example: 100 },
        },
      },
      ScheduleResult: {
        type: 'object',
        properties: {
          campaignId: { type: 'string', format: 'uuid' },
          scheduledCount: { type: 'integer' },
          duplicatesRemoved: { type: 'integer' },
          firstSendAt: { type: 'string', format: 'date-time' },
          lastSendAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  paths: {
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Liveness of the API, Postgres and Redis',
        security: [],
        responses: { 200: { description: 'Healthy' }, 503: { description: 'Degraded' } },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Create an email/password account',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Created', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResult' } } } },
          409: errorResponse,
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Log in with email/password (sets session cookie, returns bearer token)',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: { email: { type: 'string', format: 'email' }, password: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResult' } } } },
          401: errorResponse,
        },
      },
    },
    '/auth/logout': {
      post: { tags: ['Auth'], summary: 'Clear the session cookie', responses: { 204: { description: 'Logged out' } } },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Current user',
        responses: {
          200: {
            description: 'OK',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { user: { $ref: '#/components/schemas/User' } } },
              },
            },
          },
          401: errorResponse,
        },
      },
    },
    '/auth/google': {
      get: {
        tags: ['Auth'],
        summary: 'Start Google OAuth (open in a browser, not Swagger)',
        security: [],
        responses: { 302: { description: 'Redirect to Google' } },
      },
    },
    '/senders': {
      get: {
        tags: ['Senders'],
        summary: 'SMTP identities available as "From"',
        responses: {
          200: {
            description: 'OK',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { items: { type: 'array', items: { $ref: '#/components/schemas/Sender' } } } },
              },
            },
          },
        },
      },
    },
    '/emails/schedule': {
      post: {
        tags: ['Emails'],
        summary: 'Schedule a campaign (one delayed job per recipient)',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ScheduleRequest' } } },
        },
        responses: {
          201: { description: 'Scheduled', content: { 'application/json': { schema: { $ref: '#/components/schemas/ScheduleResult' } } } },
          400: errorResponse,
        },
      },
    },
    '/emails': {
      get: {
        tags: ['Emails'],
        summary: 'List scheduled or sent emails (search uses Elasticsearch)',
        parameters: [
          { name: 'folder', in: 'query', schema: { type: 'string', enum: ['scheduled', 'sent'], default: 'scheduled' } },
          { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Full-text search' },
          { name: 'status', in: 'query', schema: { $ref: '#/components/schemas/EmailStatus' } },
          { name: 'cursor', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 25, maximum: 100 } },
        ],
        responses: {
          200: {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    items: { type: 'array', items: { $ref: '#/components/schemas/EmailSummary' } },
                    nextCursor: { type: 'string', nullable: true },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/emails/stats': {
      get: {
        tags: ['Emails'],
        summary: 'Counts per folder',
        responses: {
          200: {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    scheduled: { type: 'integer' },
                    sent: { type: 'integer' },
                    failed: { type: 'integer' },
                    rateLimited: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/emails/{id}': {
      get: {
        tags: ['Emails'],
        summary: 'Email detail',
        parameters: [idParam],
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/EmailDetail' } } } },
          404: errorResponse,
        },
      },
      delete: {
        tags: ['Emails'],
        summary: 'Cancel a scheduled email',
        parameters: [idParam],
        responses: { 204: { description: 'Cancelled' }, 409: errorResponse },
      },
    },
    '/emails/{id}/star': {
      patch: {
        tags: ['Emails'],
        summary: 'Star / unstar',
        parameters: [idParam],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: { starred: { type: 'boolean' } } } } },
        },
        responses: { 204: { description: 'Updated' } },
      },
    },
    '/slack/status': {
      get: { tags: ['Slack'], summary: 'Slack connection status', responses: { 200: { description: 'OK' } } },
    },
    '/slack/connect': {
      post: { tags: ['Slack'], summary: 'Get the Slack OAuth authorize URL', responses: { 200: { description: 'OK' } } },
    },
    '/slack/test': {
      post: { tags: ['Slack'], summary: 'Send a test message to the connected channel', responses: { 204: { description: 'Sent' } } },
    },
    '/slack': {
      delete: { tags: ['Slack'], summary: 'Disconnect Slack', responses: { 204: { description: 'Disconnected' } } },
    },
  },
};
