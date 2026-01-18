import { AuthService } from '@auth/application/services';
import { Provider } from '@nestjs/common';
import { AUTH_REPOSITORY_TOKENS } from '../repositories/auth.repository.tokens';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';
import { LoginAttemptRepository } from '../repositories/login-attempt.repository';
import { OrganizationRepository } from '../repositories/organization.repository';
import { EmailService } from '../services/email.service';

export const AuthProviders: Provider[] = [
  AuthService,
  {
    provide: AUTH_REPOSITORY_TOKENS.REFRESH_TOKEN_REPOSITORY,
    useClass: RefreshTokenRepository,
  },
  {
    provide: AUTH_REPOSITORY_TOKENS.LOGIN_ATTEMPT_REPOSITORY,
    useClass: LoginAttemptRepository,
  },
  {
    provide: AUTH_REPOSITORY_TOKENS.ORGANIZATION_REPOSITORY,
    useClass: OrganizationRepository,
  },
  {
    provide: AUTH_REPOSITORY_TOKENS.EMAIL_SERVICE,
    useClass: EmailService,
  },
];
