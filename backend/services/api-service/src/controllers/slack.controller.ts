import { Request, Response } from 'express';
import { env } from '@reachinbox/shared';
import { SlackService } from '../services/slack.service';

export class SlackController {
  constructor(private readonly slack: SlackService) {}

  status = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.slack.status(req.auth!.userId));
  };

  connect = async (req: Request, res: Response): Promise<void> => {
    res.json({ url: this.slack.getAuthorizeUrl(req.auth!.userId) });
  };

  callback = async (req: Request, res: Response): Promise<void> => {
    const { code, state, error } = req.query as Record<string, string | undefined>;
    if (error || !code || !state) {
      res.redirect(`${env.FRONTEND_URL}/scheduled?slack=cancelled`);
      return;
    }
    try {
      await this.slack.handleCallback(code, state);
      res.redirect(`${env.FRONTEND_URL}/scheduled?slack=connected`);
    } catch {
      res.redirect(`${env.FRONTEND_URL}/scheduled?slack=error`);
    }
  };

  disconnect = async (req: Request, res: Response): Promise<void> => {
    await this.slack.disconnect(req.auth!.userId);
    res.status(204).end();
  };

  test = async (req: Request, res: Response): Promise<void> => {
    await this.slack.sendTestMessage(req.auth!.userId);
    res.status(204).end();
  };
}
