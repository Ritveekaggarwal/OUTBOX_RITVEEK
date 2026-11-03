import { PrismaClient, SlackIntegration } from '@prisma/client';

export interface SlackIntegrationInput {
  userId: string;
  teamId: string;
  teamName: string;
  channel: string;
  webhookUrlEnc: string;
}

export class SlackRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findByUser(userId: string): Promise<SlackIntegration | null> {
    return this.prisma.slackIntegration.findUnique({ where: { userId } });
  }

  upsert(input: SlackIntegrationInput): Promise<SlackIntegration> {
    const { userId, ...rest } = input;
    return this.prisma.slackIntegration.upsert({ where: { userId }, create: input, update: rest });
  }

  async deleteByUser(userId: string): Promise<void> {
    await this.prisma.slackIntegration.deleteMany({ where: { userId } });
  }
}
