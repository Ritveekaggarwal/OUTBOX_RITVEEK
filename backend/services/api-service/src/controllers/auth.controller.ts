import { Request, Response } from 'express';
import { env } from '@reachinbox/shared';
import { AuthService } from '../services/auth.service';
import { GoogleOAuthService } from '../services/google-oauth.service';
import { SESSION_COOKIE, TokenService } from '../services/token.service';
import { LoginInput, RegisterInput } from '../validators/schemas';

const OAUTH_STATE_COOKIE = 'rb_oauth_state';
const GOOGLE_STATE_PURPOSE = 'google-login';

export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly google: GoogleOAuthService,
    private readonly tokens: TokenService,
  ) {}

  register = async (req: Request, res: Response): Promise<void> => {
    const result = await this.auth.register(req.body as RegisterInput);
    res.cookie(SESSION_COOKIE, result.token, this.tokens.cookieOptions());
    res.status(201).json(result);
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const result = await this.auth.login(req.body as LoginInput);
    res.cookie(SESSION_COOKIE, result.token, this.tokens.cookieOptions());
    res.json(result);
  };

  logout = async (_req: Request, res: Response): Promise<void> => {
    res.clearCookie(SESSION_COOKIE, { ...this.tokens.cookieOptions(), maxAge: undefined });
    res.status(204).end();
  };

  me = async (req: Request, res: Response): Promise<void> => {
    res.json({ user: await this.auth.me(req.auth!.userId) });
  };

  /** Step 1: redirect to Google with a signed state that is also pinned in a cookie. */
  googleStart = async (_req: Request, res: Response): Promise<void> => {
    const state = this.tokens.signState(GOOGLE_STATE_PURPOSE);
    const url = this.google.getAuthorizationUrl(state);
    res.cookie(OAUTH_STATE_COOKIE, state, this.tokens.cookieOptions(10 * 60 * 1000));
    res.redirect(url);
  };

  /** Step 2: Google redirects back here; verify state, exchange code, start session. */
  googleCallback = async (req: Request, res: Response): Promise<void> => {
    const { code, state, error } = req.query as Record<string, string | undefined>;
    const expectedState = req.cookies?.[OAUTH_STATE_COOKIE] as string | undefined;
    res.clearCookie(OAUTH_STATE_COOKIE, { path: '/' });

    const fail = (reason: string) => res.redirect(`${env.FRONTEND_URL}/login?error=${encodeURIComponent(reason)}`);

    if (error) return void fail('Google sign-in was cancelled');
    if (!code || !state || !expectedState || state !== expectedState) return void fail('Invalid login session');

    try {
      this.tokens.verifyState(state, GOOGLE_STATE_PURPOSE);
      const user = await this.google.handleCallback(code);
      const { token } = this.auth.issue(user);
      res.cookie(SESSION_COOKIE, token, this.tokens.cookieOptions());
      res.redirect(`${env.FRONTEND_URL}/scheduled`);
    } catch {
      fail('Google sign-in failed, please try again');
    }
  };
}
