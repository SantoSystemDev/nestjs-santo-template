import { Injectable, Logger } from '@nestjs/common';
import { EmailServicePort } from '@auth/domain/ports/email-service.port';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class EmailService implements EmailServicePort {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const verificationLink = `${process.env.APP_URL}/verify-email?token=${token}`;
    const template = this.loadTemplate('email-verification.html');
    const html = template
      .replace('{{name}}', email.split('@')[0])
      .replace('{{verificationLink}}', verificationLink)
      .replace('{{expirationHours}}', '24');

    await this.sendEmail({
      to: email,
      subject: 'Verify your email address',
      html,
    });
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetLink = `${process.env.APP_URL}/reset-password?token=${token}`;
    const template = this.loadTemplate('password-reset.html');
    const html = template
      .replace('{{name}}', email.split('@')[0])
      .replace('{{resetLink}}', resetLink)
      .replace('{{expirationMinutes}}', '60');

    await this.sendEmail({
      to: email,
      subject: 'Reset your password',
      html,
    });
  }

  async sendAccountLockedEmail(email: string, unlockTime: Date): Promise<void> {
    const template = this.loadTemplate('account-locked.html');
    const html = template
      .replace('{{name}}', email.split('@')[0])
      .replace('{{unlockTime}}', this.formatDate(unlockTime))
      .replace(
        '{{supportEmail}}',
        process.env.SUPPORT_EMAIL || 'support@example.com',
      );

    await this.sendEmail({
      to: email,
      subject: 'Your account has been temporarily locked',
      html,
    });
  }

  async sendPasswordChangedEmail(email: string): Promise<void> {
    const template = this.loadTemplate('password-changed.html');
    const html = template
      .replace('{{name}}', email.split('@')[0])
      .replace('{{changeTime}}', this.formatDate(new Date()))
      .replace(
        '{{supportEmail}}',
        process.env.SUPPORT_EMAIL || 'support@example.com',
      );

    await this.sendEmail({
      to: email,
      subject: 'Your password has been changed',
      html,
    });
  }

  private async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@example.com',
        to: options.to,
        subject: options.subject,
        html: options.html,
      });

      this.logger.log(`Email sent to ${options.to}: ${options.subject}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}:`, error);
      throw error;
    }
  }

  private loadTemplate(filename: string): string {
    const templatePath = path.join(__dirname, '../../templates', filename);
    return fs.readFileSync(templatePath, 'utf-8');
  }

  private formatDate(date: Date): string {
    return date.toLocaleString('en-US', {
      timeZone: 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  }
}
