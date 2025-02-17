import { AuthProviders } from '@auth/infrastructure/providers';
import { AuthController } from '@auth/presentation/controllers';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UserModule } from '@user/user.module';

@Module({
  imports: [
    UserModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'super-secret-key',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [AuthController],
  providers: [...AuthProviders],
  exports: [...AuthProviders],
})
export class AuthModule {}
