import bcrypt from 'bcryptjs';
import { User, UserRepository } from '@reachinbox/shared';
import { AppError } from '../utils/app-error';
import { LoginInput, RegisterInput } from '../validators/schemas';
import { TokenService } from './token.service';

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

export interface AuthResult {
  user: PublicUser;
  token: string;
}

export const toPublicUser = (user: User): PublicUser => ({
  id: user.id,
  email: user.email,
  name: user.name,
  avatarUrl: user.avatarUrl,
});

const BCRYPT_ROUNDS = 12;
// Compared against when the email does not exist so login timing does not leak account existence.
const DUMMY_HASH = bcrypt.hashSync('timing-safe-placeholder', BCRYPT_ROUNDS);

export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly tokens: TokenService,
  ) {}

  async register(input: RegisterInput): Promise<AuthResult> {
    const existing = await this.users.findByEmail(input.email);
    if (existing) throw AppError.conflict('An account with this email already exists');

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    const user = await this.users.createLocal({ email: input.email, name: input.name, passwordHash });
    return this.issue(user);
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const user = await this.users.findByEmail(input.email);
    const valid = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !user.passwordHash || !valid) {
      throw AppError.unauthorized(
        user && !user.passwordHash ? 'This account uses Google sign-in' : 'Invalid email or password',
      );
    }
    return this.issue(user);
  }

  async me(userId: string): Promise<PublicUser> {
    const user = await this.users.findById(userId);
    if (!user) throw AppError.unauthorized();
    return toPublicUser(user);
  }

  issue(user: User): AuthResult {
    return { user: toPublicUser(user), token: this.tokens.sign(user.id) };
  }
}
