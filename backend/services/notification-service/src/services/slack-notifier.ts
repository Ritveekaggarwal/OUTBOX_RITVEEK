import { decryptSecret, Logger, RateLimitNotificationJobData, SlackRepository } from '@reachinbox/shared';

export type NotifyOutcome = 'sent' | 'not-connected' | 'revoked';

const SCOPE_LABEL: Record<RateLimitNotificationJobData['scope'], string> = {
  global: 'Global hourly limit',
  sender: 'Sender hourly limit',
  campaign: 'Campaign hourly limit',
};

const formatTime = (iso: string): string =>
  new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }) + ' UTC';

/** Posts alerts to the channel the user picked during Slack OAuth. */
export class SlackNotifier {
  constructor(
    private readonly slack: SlackRepository,
    private readonly logger: Logger,
  ) {}

  async notifyRateLimit(data: RateLimitNotificationJobData): Promise<NotifyOutcome> {
    // Looked up on every alert, so connecting / disconnecting Slack takes effect without a restart.
    const integration = await this.slack.findByUser(data.userId);
    if (!integration) return 'not-connected';

    const response = await fetch(decryptSecret(integration.webhookUrlEnc), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `:rotating_light: ${SCOPE_LABEL[data.scope]} reached for ${data.senderEmail}`,
        blocks: [
          {
            type: 'header',
            text: { type: 'plain_text', text: ':rotating_light: Hourly sending limit reached' },
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*Limit*\n${SCOPE_LABEL[data.scope]} (${data.limit}/hour)` },
              { type: 'mrkdwn', text: `*Sender*\n${data.senderEmail}` },
              { type: 'mrkdwn', text: `*Window started*\n${formatTime(data.windowStart)}` },
              { type: 'mrkdwn', text: `*Sending resumes*\n${formatTime(data.resumesAt)}` },
            ],
          },
          {
            type: 'context',
            elements: [
              { type: 'mrkdwn', text: 'No emails were dropped. Remaining emails were moved to the next hour window in order.' },
            ],
          },
        ],
      }),
    });

    // 403/404/410 mean the app was removed or the channel was archived: forget the webhook.
    if ([403, 404, 410].includes(response.status)) {
      await this.slack.deleteByUser(data.userId);
      this.logger.warn({ userId: data.userId, status: response.status }, 'Slack webhook revoked, integration removed');
      return 'revoked';
    }
    if (!response.ok) {
      throw new Error(`Slack webhook responded with ${response.status}: ${await response.text()}`);
    }
    return 'sent';
  }
}
