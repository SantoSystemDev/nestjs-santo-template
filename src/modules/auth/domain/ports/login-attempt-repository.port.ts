import { LoginAttemptModel } from '../models/login-attempt.model';

export interface CreateLoginAttemptDto {
  email: string;
  userId?: string;
  ipAddress: string;
  userAgent?: string;
  success: boolean;
  failureReason?: string;
}

export interface LoginAttemptRepositoryPort {
  create(data: CreateLoginAttemptDto): Promise<LoginAttemptModel>;
  countRecentFailures(email: string, minutesAgo: number): Promise<number>;
  deleteOlderThan(days: number): Promise<number>;
}
