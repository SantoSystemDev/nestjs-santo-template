import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { envValidation } from 'src/config/env.validation';
import { AuthModule, HealthModule, UserModule } from './modules';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: envValidation }),
    ThrottlerModule.forRoot([
      {
        ttl: Number(process.env.RATE_LIMIT_TTL ?? 60),
        limit: Number(process.env.RATE_LIMIT_LIMIT ?? 100),
      },
    ]),
    HealthModule,
    UserModule,
    AuthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
