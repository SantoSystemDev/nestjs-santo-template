import { RefreshTokenModel } from '@user/domain/models';

export abstract class RefreshTokenRepository {
  abstract save(
    entry: Omit<RefreshTokenModel, 'id' | 'createdAt'>,
  ): Promise<RefreshTokenModel>;
  abstract findByJti(jti: string): Promise<RefreshTokenModel | null>;
  abstract findByHash(tokenHash: string): Promise<RefreshTokenModel | null>;
  abstract markReplaced(currentJti: string, newJti: string): Promise<void>;
  abstract revoke(jti: string, reason?: string): Promise<void>;
  abstract revokeAllForUser(userId: string, reason?: string): Promise<void>;
}
