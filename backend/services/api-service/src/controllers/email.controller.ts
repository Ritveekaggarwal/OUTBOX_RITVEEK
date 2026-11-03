import { Request, Response } from 'express';
import { CampaignService } from '../services/campaign.service';
import { EmailService } from '../services/email.service';
import { ListEmailsQuery, ScheduleCampaignInput } from '../validators/schemas';

export class EmailController {
  constructor(
    private readonly emails: EmailService,
    private readonly campaigns: CampaignService,
  ) {}

  schedule = async (req: Request, res: Response): Promise<void> => {
    const result = await this.campaigns.schedule(req.auth!.userId, req.body as ScheduleCampaignInput);
    res.status(201).json(result);
  };

  list = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.emails.list(req.auth!.userId, req.query as unknown as ListEmailsQuery));
  };

  stats = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.emails.stats(req.auth!.userId));
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.emails.getById(req.auth!.userId, req.params.id!));
  };

  setStarred = async (req: Request, res: Response): Promise<void> => {
    await this.emails.setStarred(req.auth!.userId, req.params.id!, (req.body as { starred: boolean }).starred);
    res.status(204).end();
  };

  cancel = async (req: Request, res: Response): Promise<void> => {
    await this.emails.cancel(req.auth!.userId, req.params.id!);
    res.status(204).end();
  };
}
