export class LoginAttemptModel {
  readonly id: string;
  readonly email: string;
  readonly userId?: string;
  readonly ipAddress: string;
  readonly userAgent?: string;
  readonly success: boolean;
  readonly failureReason?: string;
  readonly timestamp: Date;

  constructor(data: Partial<LoginAttemptModel>) {
    Object.assign(this, data);
  }

  static create(data: {
    email: string;
    userId?: string;
    ipAddress: string;
    userAgent?: string;
    success: boolean;
    failureReason?: string;
  }): LoginAttemptModel {
    return new LoginAttemptModel({
      ...data,
      timestamp: new Date(),
    });
  }
}
