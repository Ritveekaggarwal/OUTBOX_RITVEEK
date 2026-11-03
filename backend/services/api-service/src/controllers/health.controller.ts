import { Request, Response } from 'express';
import type { PrismaClient, Redis } from '@reachinbox/shared';

export class HealthController {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly redis: Redis,
  ) {}

  check = async (_req: Request, res: Response): Promise<void> => {
    const [db, redis] = await Promise.allSettled([this.prisma.$queryRaw`SELECT 1`, this.redis.ping()]);
    const healthy = db.status === 'fulfilled' && redis.status === 'fulfilled';
    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'ok' : 'degraded',
      database: db.status === 'fulfilled' ? 'up' : 'down',
      redis: redis.status === 'fulfilled' ? 'up' : 'down',
      timestamp: new Date().toISOString(),
    });
  };
}
