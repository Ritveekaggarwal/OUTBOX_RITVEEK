import nodemailer, { Transporter } from 'nodemailer';
import { decryptSecret, Sender } from '@reachinbox/shared';

export interface OutgoingMail {
  to: string;
  subject: string;
  html: string;
  /** Stable id so SMTP-level retries can be deduplicated by the receiving side. */
  messageId: string;
}

export interface SendReceipt {
  messageId: string;
  previewUrl: string | null;
}

export interface Mailer {
  send(sender: Sender, mail: OutgoingMail): Promise<SendReceipt>;
  close(): void;
}

const htmlToText = (html: string): string =>
  html
    .replace(/<(br|\/p|\/div|\/li)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

/** Nodemailer SMTP mailer with one pooled transport per sender account. */
export class SmtpMailer implements Mailer {
  private readonly transports = new Map<string, Transporter>();

  private transportFor(sender: Sender): Transporter {
    const cached = this.transports.get(sender.id);
    if (cached) return cached;
    const transport = nodemailer.createTransport({
      pool: true,
      maxConnections: 3,
      host: sender.smtpHost,
      port: sender.smtpPort,
      secure: sender.smtpPort === 465,
      auth: { user: sender.smtpUser, pass: decryptSecret(sender.smtpPassEnc) },
    });
    this.transports.set(sender.id, transport);
    return transport;
  }

  async send(sender: Sender, mail: OutgoingMail): Promise<SendReceipt> {
    const info = await this.transportFor(sender).sendMail({
      from: { name: sender.name, address: sender.email },
      to: mail.to,
      subject: mail.subject,
      html: mail.html,
      text: htmlToText(mail.html),
      messageId: mail.messageId,
    });
    const preview = nodemailer.getTestMessageUrl(info);
    return { messageId: info.messageId, previewUrl: typeof preview === 'string' ? preview : null };
  }

  close(): void {
    for (const transport of this.transports.values()) transport.close();
    this.transports.clear();
  }
}
