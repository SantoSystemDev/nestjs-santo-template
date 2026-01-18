export interface EmailServicePort {
  sendVerificationEmail(email: string, token: string): Promise<void>;
  sendPasswordResetEmail(email: string, token: string): Promise<void>;
  sendAccountLockedEmail(email: string, unlockTime: Date): Promise<void>;
  sendPasswordChangedEmail(email: string): Promise<void>;
}
