import { OAuth2Client } from 'google-auth-library';
import { env, isGoogleAuthConfigured, User, UserRepository } from '@reachinbox/shared';
import { AppError } from '../utils/app-error';

/** Real Google OAuth 2.0 authorization-code flow with ID token verification. */
export class GoogleOAuthService {
  private readonly client: OAuth2Client | null;

  constructor(private readonly users: UserRepository) {
    this.client = isGoogleAuthConfigured()
      ? new OAuth2Client(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, env.GOOGLE_REDIRECT_URI)
      : null;
  }

  private requireClient(): OAuth2Client {
    if (!this.client) throw AppError.unavailable('Google login is not configured on the server');
    return this.client;
  }

  getAuthorizationUrl(state: string): string {
    return this.requireClient().generateAuthUrl({
      access_type: 'online',
      scope: ['openid', 'email', 'profile'],
      prompt: 'select_account',
      state,
    });
  }

  async handleCallback(code: string): Promise<User> {
    const client = this.requireClient();
    const { tokens } = await client.getToken(code);
    if (!tokens.id_token) throw AppError.unauthorized('Google did not return an identity token');

    const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    if (!payload?.email || !payload.email_verified) {
      throw AppError.unauthorized('Google account email is not verified');
    }

    return this.users.upsertGoogleUser({
      googleId: payload.sub,
      email: payload.email,
      name: payload.name ?? payload.email.split('@')[0]!,
      avatarUrl: payload.picture,
    });
  }
}
