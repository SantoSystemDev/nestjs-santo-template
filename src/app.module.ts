import { Module } from '@nestjs/common';
import { HealthModule, UserModule } from './app/modules';

@Module({
  imports: [HealthModule, UserModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
