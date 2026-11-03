import { Request, Response } from 'express';
import { SenderService } from '../services/sender.service';

export class SenderController {
  constructor(private readonly senders: SenderService) {}

  list = async (_req: Request, res: Response): Promise<void> => {
    res.json({ items: await this.senders.list() });
  };
}
