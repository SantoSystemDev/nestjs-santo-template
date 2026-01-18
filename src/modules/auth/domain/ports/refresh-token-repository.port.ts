import { RefreshTokenModel } from '@user/domain/models/refresh-token.model';

export interface CreateRefreshTokenDto {
  userId: string;
  jti: string;
  tokenHash: string;
  deviceId?: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: Date;
}

export interface RefreshTokenRepositoryPort {
  create(data: CreateRefreshTokenDto): Promise<RefreshTokenModel>;
  findByJti(jti: string): Promise<RefreshTokenModel | null>;
  findActiveByUserId(userId: string): Promise<RefreshTokenModel[]>;
  revoke(
    jti: string,
    reason: string,
    replacedByJti?: string,
  ): Promise<RefreshTokenModel>;
  revokeAllByUserId(userId: string, reason: string): Promise<number>;
  removeOldest(userId: string, limit: number): Promise<number>;
  deleteExpired(): Promise<number>;
}
