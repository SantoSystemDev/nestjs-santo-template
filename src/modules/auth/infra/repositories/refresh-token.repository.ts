import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/database/prisma.service';
import {
  CreateRefreshTokenDto,
  RefreshTokenRepositoryPort,
} from '@auth/domain/ports/refresh-token-repository.port';
import { RefreshTokenModel } from '@user/domain/models/refresh-token.model';

@Injectable()
export class RefreshTokenRepository implements RefreshTokenRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateRefreshTokenDto): Promise<RefreshTokenModel> {
    const token = await this.prisma.refreshToken.create({
      data: {
        userId: data.userId,
        jti: data.jti,
        tokenHash: data.tokenHash,
        deviceId: data.deviceId,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        expiresAt: data.expiresAt,
      },
    });

    return new RefreshTokenModel(token);
  }

  async findByJti(jti: string): Promise<RefreshTokenModel | null> {
    const token = await this.prisma.refreshToken.findUnique({
      where: { jti },
    });

    return token ? new RefreshTokenModel(token) : null;
  }

  async findActiveByUserId(userId: string): Promise<RefreshTokenModel[]> {
    const tokens = await this.prisma.refreshToken.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    return tokens.map((token) => new RefreshTokenModel(token));
  }

  async revoke(
    jti: string,
    reason: string,
    replacedByJti?: string,
  ): Promise<RefreshTokenModel> {
    const token = await this.prisma.refreshToken.update({
      where: { jti },
      data: {
        revokedAt: new Date(),
        revokedReason: reason,
        replacedByJti,
        updatedAt: new Date(),
      },
    });

    return new RefreshTokenModel(token);
  }

  async revokeAllByUserId(userId: string, reason: string): Promise<number> {
    const result = await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
        revokedReason: reason,
        updatedAt: new Date(),
      },
    });

    return result.count;
  }

  async removeOldest(userId: string, limit: number): Promise<number> {
    const activeTokens = await this.prisma.refreshToken.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    if (activeTokens.length <= limit) {
      return 0;
    }

    const tokensToRemove = activeTokens.slice(0, activeTokens.length - limit);
    const idsToRemove = tokensToRemove.map((t) => t.id);

    const result = await this.prisma.refreshToken.deleteMany({
      where: { id: { in: idsToRemove } },
    });

    return result.count;
  }

  async deleteExpired(): Promise<number> {
    const result = await this.prisma.refreshToken.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: new Date() } }, { revokedAt: { not: null } }],
      },
    });

    return result.count;
  }
}
