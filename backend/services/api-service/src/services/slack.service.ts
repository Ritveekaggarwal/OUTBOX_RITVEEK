import { decryptSecret, encryptSecret, env, isSlackConfigured, SlackRepository } from '@reachinbox/shared';
import { AppError } from '../utils/app-error';
import { TokenService } from './token.service';

const SLACK_STATE_PURPOSE = 'slack-connect';

interface SlackOAuthResponse {
  ok: boolean;
  error?: string;
  team?: { id: string; name: string };
  incoming_webhook?: { channel: string; url: string };
}

export interface SlackStatus {
  configured: boolean;
  connected: boolean;
  teamName?: string;
  channel?: string;
}

/**
 * Slack OAuth v2 with the `incoming-webhook` scope: the user picks a channel
 * during authorization and we store that channel's webhook (encrypted).
 */
export class SlackService {
  constructor(
    private readonly slack: SlackRepository,
    private readonly tokens: TokenService,
  ) {}

  async status(userId: string): Promise<SlackStatus> {
    const integration = await this.slack.findByUser(userId);
    return {
      configured: isSlackConfigured(),
      connected: Boolean(integration),
      teamName: integration?.teamName,
      channel: integration?.channel,
    };
  }

  getAuthorizeUrl(userId: string): string {
    if (!isSlackConfigured()) throw AppError.unavailable('Slack integration is not configured on the server');
    const params = new URLSearchParams({
      client_id: env.SLACK_CLIENT_ID!,
      scope: 'incoming-webhook',
      redirect_uri: env.SLACK_REDIRECT_URI!,
      state: this.tokens.signState(SLACK_STATE_PURPOSE, userId),
    });
    return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
  }

  /** The OAuth state is a signed, 10-minute JWT carrying the user id (CSRF protection). */
  async handleCallback(code: string, state: string): Promise<void> {
    let userId: string;
    try {
      userId = this.tokens.verifyState(state, SLACK_STATE_PURPOSE);
    } catch {
      throw AppError.badRequest('Slack authorization expired, please try again');
    }

    const response = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: env.SLACK_CLIENT_ID!,
        client_secret: env.SLACK_CLIENT_SECRET!,
        code,
        redirect_uri: env.SLACK_REDIRECT_URI!,
      }),
    });
    const data = (await response.json()) as SlackOAuthResponse;
    if (!data.ok || !data.incoming_webhook || !data.team) {
      throw AppError.badRequest(`Slack authorization failed: ${data.error ?? 'missing webhook'}`);
    }

    await this.slack.upsert({
      userId,
      teamId: data.team.id,
      teamName: data.team.name,
      channel: data.incoming_webhook.channel,
      webhookUrlEnc: encryptSecret(data.incoming_webhook.url),
    });
  }

  async disconnect(userId: string): Promise<void> {
    await this.slack.deleteByUser(userId);
  }

  async sendTestMessage(userId: string): Promise<void> {
    const integration = await this.slack.findByUser(userId);
    if (!integration) throw AppError.badRequest('Slack is not connected');
    const response = await fetch(decryptSecret(integration.webhookUrlEnc), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: ':white_check_mark: ReachInbox is connected. Rate-limit alerts will appear here.' }),
    });
    if (!response.ok) throw AppError.badRequest(`Slack rejected the message (${response.status}). Reconnect Slack.`);
  }
}
