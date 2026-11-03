import { PrismaClient, User } from '@prisma/client';

export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

export class UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  }

  createLocal(data: { email: string; name: string; passwordHash: string }): Promise<User> {
    return this.prisma.user.create({ data: { ...data, email: data.email.toLowerCase() } });
  }

  /** Links a Google identity to an existing email account or creates a new user. */
  upsertGoogleUser(profile: GoogleProfile): Promise<User> {
    const email = profile.email.toLowerCase();
    return this.prisma.user.upsert({
      where: { email },
      create: { email, name: profile.name, avatarUrl: profile.avatarUrl, googleId: profile.googleId },
      update: { name: profile.name, avatarUrl: profile.avatarUrl, googleId: profile.googleId },
    });
  }
}
