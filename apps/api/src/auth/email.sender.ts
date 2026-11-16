import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export const EMAIL_SENDER = Symbol('EMAIL_SENDER');

export interface EmailSender {
  sendVerification(email: string, token: string): Promise<void>;
  sendReset(email: string, token: string): Promise<void>;
}

@Injectable()
export class SmtpEmailSender implements EmailSender {
  private async send(
    email: string,
    subject: string,
    path: string,
    token: string,
  ): Promise<void> {
    const {
      SMTP_HOST,
      SMTP_PORT,
      SMTP_USER,
      SMTP_PASSWORD,
      EMAIL_FROM,
      WEB_ORIGIN,
    } = process.env;
    if (
      !SMTP_HOST ||
      !SMTP_PORT ||
      !SMTP_USER ||
      !SMTP_PASSWORD ||
      !EMAIL_FROM ||
      !WEB_ORIGIN
    ) {
      throw new ServiceUnavailableException('Email service unavailable');
    }
    const url = new URL(path, WEB_ORIGIN);
    url.searchParams.set('token', token);
    const transport = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
    });
    try {
      await transport.sendMail({
        from: EMAIL_FROM,
        to: email,
        subject,
        text: `Open this KeyCat link: ${url.toString()}`,
      });
    } catch {
      throw new ServiceUnavailableException('Email service unavailable');
    } finally {
      transport.close();
    }
  }

  sendVerification(email: string, token: string): Promise<void> {
    return this.send(email, 'Verify your KeyCat email', '/verify-email', token);
  }

  sendReset(email: string, token: string): Promise<void> {
    return this.send(
      email,
      'Reset your KeyCat password',
      '/reset-password',
      token,
    );
  }
}
