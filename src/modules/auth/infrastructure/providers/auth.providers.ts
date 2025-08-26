import { AuthService } from '@auth/application/services';
import { Provider } from '@nestjs/common';

export const AuthProviders: Provider[] = [AuthService];
