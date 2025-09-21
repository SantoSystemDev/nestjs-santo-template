import { Injectable } from '@nestjs/common';
import { BaseRepository, PrismaService } from '@shared/database';
import { RefreshTokenModel } from '@user/domain/models';

@Injectable()
export class RefreshTokenRepository
  extends BaseRepository
  implements RefreshTokenRepository
{
  constructor(databaseService: PrismaService) {
    super(databaseService);
  }

  async save(entry: RefreshTokenModel): Promise<RefreshTokenModel> {
    return this.executeTransaction(async () => {
      const created = await this.databaseService.refreshToken.create({
        data: {
          userId: entry.userId,
          jti: entry.jti,
          tokenHash: entry.tokenHash,
          deviceId: entry.deviceId,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          expiresAt: entry.expiresAt,
          revokedAt: entry.revokedAt,
          replacedByJti: entry.replacedByJti,
        },
      });
      return this.mapToDomain(created);
    });
  }

  async findByJti(jti: string): Promise<RefreshTokenModel | null> {
    return this.executeQuery(async () => {
      const token = await this.databaseService.refreshToken.findUnique({
        where: { jti },
      });
      return this.mapToDomain(token);
    });
  }

  async findByHash(tokenHash: string): Promise<RefreshTokenModel | null> {
    return this.executeQuery(async () => {
      const token = await this.databaseService.refreshToken.findFirst({
        where: { tokenHash },
      });
      return this.mapToDomain(token);
    });
  }

  async markReplaced(currentJti: string, newJti: string): Promise<void> {
    await this.executeTransaction(async () => {
      await this.databaseService.refreshToken.updateMany({
        where: { jti: currentJti },
        data: { replacedByJti: newJti },
      });
    });
  }

  async revoke(jti: string, reason?: string): Promise<void> {
    await this.executeTransaction(async () => {
      await this.databaseService.refreshToken.updateMany({
        where: { jti, revokedAt: null },
        data: { revokedAt: new Date(), revokedReason: reason },
      });
    });
  }

  async revokeAllForUser(userId: string, reason?: string): Promise<void> {
    await this.executeTransaction(async () => {
      await this.databaseService.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date(), revokedReason: reason },
      });
    });
  }

  private mapToDomain(data?: any): RefreshTokenModel | null {
    return data ? new RefreshTokenModel(data) : null;
  }
}
