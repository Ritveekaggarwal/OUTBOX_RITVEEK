import { PrismaClient, Sender } from '@prisma/client';

export type PublicSender = Pick<Sender, 'id' | 'email' | 'name'>;

export class SenderRepository {
  constructor(private readonly prisma: PrismaClient) {}

  listActive(): Promise<PublicSender[]> {
    return this.prisma.sender.findMany({
      where: { isActive: true },
      select: { id: true, email: true, name: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  findActiveById(id: string): Promise<Sender | null> {
    return this.prisma.sender.findFirst({ where: { id, isActive: true } });
  }

  count(): Promise<number> {
    return this.prisma.sender.count();
  }

  upsert(data: Omit<Sender, 'id' | 'createdAt' | 'isActive'>): Promise<Sender> {
    return this.prisma.sender.upsert({
      where: { email: data.email },
      create: data,
      update: { ...data, isActive: true },
    });
  }
}
