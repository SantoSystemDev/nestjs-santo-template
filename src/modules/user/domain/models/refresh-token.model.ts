export class RefreshTokenModel {
  readonly id: string;
  readonly userId: string;
  readonly jti: string;
  readonly tokenHash: string;
  readonly deviceId?: string;
  readonly ip?: string;
  readonly userAgent?: string;
  readonly expiresAt: Date;
  readonly revokedAt?: Date;
  readonly replacedByJti?: string;

  constructor(data: Partial<RefreshTokenModel>) {
    Object.assign(this, data);
  }
}
