import { encryptSecret, env, Logger, PublicSender, SenderRepository } from '@reachinbox/shared';

const ETHEREAL_SMTP = { host: 'smtp.ethereal.email', port: 587 };
const ETHEREAL_API = 'https://api.nodemailer.com/user';

interface EtherealAccount {
  user: string;
  pass: string;
  smtp: { host: string; port: number };
}

export class SenderService {
  constructor(
    private readonly senders: SenderRepository,
    private readonly logger: Logger,
  ) {}

  list(): Promise<PublicSender[]> {
    return this.senders.listActive();
  }

  /**
   * Makes sure there are SMTP identities to send from:
   * 1. accounts listed in ETHEREAL_SENDERS are upserted, then
   * 2. fresh Ethereal accounts are generated via the Ethereal API until
   *    ETHEREAL_AUTO_CREATE_COUNT exist, so it works with zero SMTP setup.
   */
  async ensureSenders(): Promise<void> {
    for (const entry of (env.ETHEREAL_SENDERS ?? '').split(',').filter(Boolean)) {
      const separator = entry.indexOf(':');
      const user = entry.slice(0, separator).trim();
      const pass = entry.slice(separator + 1).trim();
      if (separator <= 0 || !user || !pass) {
        this.logger.warn('Skipping malformed ETHEREAL_SENDERS entry (expected user:pass)');
        continue;
      }
      await this.senders.upsert({
        email: user,
        name: this.displayName(user),
        smtpHost: ETHEREAL_SMTP.host,
        smtpPort: ETHEREAL_SMTP.port,
        smtpUser: user,
        smtpPassEnc: encryptSecret(pass),
      });
    }

    // Top up to ETHEREAL_AUTO_CREATE_COUNT senders so multi-sender limits can be exercised.
    for (let i = await this.senders.count(); i < env.ETHEREAL_AUTO_CREATE_COUNT; i++) {
      try {
        const account = await this.createEtherealAccount();
        await this.senders.upsert({
          email: account.user,
          name: this.displayName(account.user),
          smtpHost: account.smtp.host,
          smtpPort: account.smtp.port,
          smtpUser: account.user,
          smtpPassEnc: encryptSecret(account.pass),
        });
        this.logger.info({ user: account.user }, 'Created Ethereal sender account');
      } catch (error) {
        this.logger.error({ err: error }, 'Could not create Ethereal account. Set ETHEREAL_SENDERS in .env');
        return;
      }
    }
  }

  /**
   * Calls the Ethereal API directly: nodemailer.createTestAccount() caches its
   * result per process, which would hand back the same account every time.
   */
  private async createEtherealAccount(): Promise<EtherealAccount> {
    const response = await fetch(ETHEREAL_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestor: 'reachinbox-scheduler', version: '1.0.0' }),
    });
    const data = (await response.json()) as Partial<EtherealAccount> & { status?: string; error?: string };
    if (!response.ok || data.status !== 'success' || !data.user || !data.pass || !data.smtp) {
      throw new Error(`Ethereal API error: ${data.error ?? response.status}`);
    }
    return { user: data.user, pass: data.pass, smtp: data.smtp };
  }

  private displayName(email: string): string {
    const local = email.split('@')[0] ?? email;
    return local
      .split(/[._-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
}
