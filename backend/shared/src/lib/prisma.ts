import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';

let client: PrismaClient | undefined;

/** Lazily created singleton so each service process holds exactly one connection pool. */
export function getPrisma(): PrismaClient {
  if (!client) {
    client = new PrismaClient({
      log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  }
  return client;
}

export async function disconnectPrisma(): Promise<void> {
  if (client) {
    await client.$disconnect();
    client = undefined;
  }
}
