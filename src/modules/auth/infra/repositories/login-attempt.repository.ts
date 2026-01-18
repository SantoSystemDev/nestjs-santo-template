import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/database/prisma.service';
import {
  CreateLoginAttemptDto,
  LoginAttemptRepositoryPort,
} from '@auth/domain/ports/login-attempt-repository.port';
import { LoginAttemptModel } from '@auth/domain/models/login-attempt.model';

@Injectable()
export class LoginAttemptRepository implements LoginAttemptRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateLoginAttemptDto): Promise<LoginAttemptModel> {
    const attempt = await this.prisma.login_attempts.create({
      data: {
        email: data.email,
        userId: data.userId,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        success: data.success,
        failureReason: data.failureReason,
      },
    });

    return new LoginAttemptModel(attempt);
  }

  async countRecentFailures(
    email: string,
    minutesAgo: number,
  ): Promise<number> {
    const since = new Date(Date.now() - minutesAgo * 60 * 1000);

    const count = await this.prisma.login_attempts.count({
      where: {
        email,
        success: false,
        timestamp: { gte: since },
      },
    });

    return count;
  }

  async deleteOlderThan(days: number): Promise<number> {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const result = await this.prisma.login_attempts.deleteMany({
      where: {
        timestamp: { lt: cutoffDate },
      },
    });

    return result.count;
  }
}
