import { AuthService } from '@auth/application/services';
import { AuthServicePort } from '@auth/domain/ports';
import { Provider } from '@nestjs/common';

export const AuthProviders: Provider[] = [
  { provide: AuthServicePort, useClass: AuthService },
];
