import { Module } from '@nestjs/common';
import { OrganizationController } from './presentation/controllers';
import { OrganizationService } from './application/services';
import { AuthModule } from '@auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [OrganizationController],
  providers: [OrganizationService],
})
export class OrganizationModule {}
