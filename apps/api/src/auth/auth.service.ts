import { createHash, randomBytes } from 'node:crypto';
import {
  Inject,
  Injectable,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../persistence/prisma.service';
import {
  AUTH_INVALID,
  AUTH_POLICY,
  AUTH_REQUIRED,
  authError,
  validatePassword,
} from './auth.policy';
import { EMAIL_SENDER, type EmailSender } from './email.sender';
import type {
  ChangePasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  UpdateProfileDto,
  UpdateSettingsDto,
} from './auth.dto';

type Account = {
  id: string;
  email: string;
  username: string;
  role: 'MEMBER' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED' | 'DELETED';
  emailVerifiedAt: Date | null;
};

export type AuthPrincipal = {
  userId: string;
  role: 'MEMBER' | 'ADMIN';
  emailVerified: boolean;
};

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function newToken(): string {
  return randomBytes(32).toString('hex');
}

@Injectable()
export class AuthService {
  private readonly jwtSecret: string;

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(EMAIL_SENDER) private readonly emailSender: EmailSender,
  ) {
    const secret = process.env.AUTH_JWT_SECRET;
    if (!secret || secret.length < 32 || secret.startsWith('replace-with'))
      throw new Error('AUTH_JWT_SECRET must contain at least 32 characters');
    this.jwtSecret = secret;
  }

  private account(user: Account) {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      status: user.status,
      emailVerified: !!user.emailVerifiedAt,
    };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw AUTH_INVALID();
    return {
      ...this.account(user),
      displayName: user.displayName,
      timezone: user.timezone,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    if (Object.values(dto).some((value) => value === null))
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Null profile field',
      });
    if (dto.timezone?.trim()) {
      try {
        new Intl.DateTimeFormat('en', { timeZone: dto.timezone.trim() });
      } catch {
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'Invalid timezone',
        });
      }
    }
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.displayName !== undefined
          ? { displayName: dto.displayName.trim() || null }
          : {}),
        ...(dto.timezone !== undefined
          ? { timezone: dto.timezone.trim() || null }
          : {}),
      },
    });
    return {
      ...this.account(user),
      displayName: user.displayName,
      timezone: user.timezone,
    };
  }

  private settingsView(row: {
    uiLanguage: string;
    themeKey: string;
    typingFont: string | null;
    fontSize: number | null;
    showKeyboard: boolean;
    showHands: boolean;
    soundEnabled: boolean;
  }) {
    return {
      uiLanguage: row.uiLanguage,
      theme: row.themeKey,
      typingFont: row.typingFont ?? 'monospace',
      fontSize: row.fontSize ?? 24,
      showKeyboard: row.showKeyboard,
      showHands: row.showHands,
      soundEnabled: row.soundEnabled,
    };
  }

  async getSettings(userId: string) {
    const row = await this.prisma.userSettings.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
    return this.settingsView(row);
  }

  async updateSettings(userId: string, dto: UpdateSettingsDto) {
    if (Object.values(dto).some((value) => value === null))
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Null settings field',
      });
    const { theme, ...rest } = dto;
    const row = await this.prisma.userSettings.upsert({
      where: { userId },
      create: {
        userId,
        ...rest,
        ...(theme !== undefined ? { themeKey: theme } : {}),
      },
      update: { ...rest, ...(theme !== undefined ? { themeKey: theme } : {}) },
    });
    return this.settingsView(row);
  }

  private async limit(
    action: string,
    email: string,
    ip: string,
    maximum: number,
    windowMs: number,
  ): Promise<void> {
    await this.prisma.authRateLimit.deleteMany({
      where: {
        windowStart: { lt: new Date(Date.now() - 2 * 24 * 60 * 60_000) },
      },
    });
    const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);
    const keyHash = hashToken(
      `${action}|${email}|${ip}|${windowStart.toISOString()}`,
    );
    const rows = await this.prisma.$queryRaw<{ count: number }[]>`
      INSERT INTO auth_rate_limits (key_hash, window_start, count)
      VALUES (${keyHash}, ${windowStart}, 1)
      ON CONFLICT (key_hash) DO UPDATE SET count = auth_rate_limits.count + 1
      RETURNING count`;
    if (rows[0]?.count > maximum)
      throw authError(
        HttpStatus.TOO_MANY_REQUESTS,
        'RATE_LIMITED',
        'Please try again later',
      );
  }

  async register(dto: RegisterDto, ip: string) {
    const email = dto.email.trim().toLowerCase();
    validatePassword(dto.password);
    await this.limit(
      'register',
      email,
      ip,
      AUTH_POLICY.mailLimit,
      AUTH_POLICY.mailWindowMs,
    );
    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
    const token = newToken();
    let user;
    try {
      user = await this.prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: { email, username: dto.username.trim(), passwordHash },
        });
        await tx.verificationToken.create({
          data: {
            userId: created.id,
            purpose: 'VERIFY_EMAIL',
            tokenHash: hashToken(token),
            expiresAt: new Date(Date.now() + AUTH_POLICY.verifyMs),
          },
        });
        return created;
      });
    } catch (error) {
      if (
        typeof error === 'object' &&
        error &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw authError(
          HttpStatus.CONFLICT,
          'EMAIL_EXISTS',
          'Email or username already exists',
        );
      }
      throw error;
    }
    await this.emailSender.sendVerification(email, token);
    return { ...this.account(user), verificationRequired: true };
  }

  async verifyEmail(token: string) {
    const record = await this.prisma.verificationToken.findUnique({
      where: { tokenHash: hashToken(token) },
    });
    if (
      !record ||
      record.purpose !== 'VERIFY_EMAIL' ||
      record.usedAt ||
      record.expiresAt <= new Date()
    ) {
      throw authError(
        HttpStatus.BAD_REQUEST,
        'TOKEN_INVALID',
        'Verification link is invalid or expired',
      );
    }
    const verifiedAt = new Date();
    await this.prisma.$transaction(async (tx) => {
      const used = await tx.verificationToken.updateMany({
        where: { id: record.id, usedAt: null, expiresAt: { gt: verifiedAt } },
        data: { usedAt: verifiedAt },
      });
      if (used.count !== 1)
        throw authError(
          HttpStatus.BAD_REQUEST,
          'TOKEN_INVALID',
          'Verification link is invalid or expired',
        );
      await tx.user.update({
        where: { id: record.userId },
        data: { emailVerifiedAt: verifiedAt },
      });
    });
    return { verifiedAt: verifiedAt.toISOString() };
  }

  async resendVerification(emailInput: string, ip: string) {
    const email = emailInput.trim().toLowerCase();
    await this.limit(
      'resend',
      email,
      ip,
      AUTH_POLICY.mailLimit,
      AUTH_POLICY.mailWindowMs,
    );
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user && !user.emailVerifiedAt && user.status === 'ACTIVE') {
      const token = newToken();
      await this.prisma.verificationToken.create({
        data: {
          userId: user.id,
          purpose: 'VERIFY_EMAIL',
          tokenHash: hashToken(token),
          expiresAt: new Date(Date.now() + AUTH_POLICY.verifyMs),
        },
      });
      try {
        await this.emailSender.sendVerification(email, token);
      } catch {
        // The response must not reveal whether the email belongs to an account.
      }
    }
    return { accepted: true };
  }

  private issueAccessToken(user: Account, sessionId: string): string {
    return jwt.sign({ sid: sessionId, role: user.role }, this.jwtSecret, {
      algorithm: 'HS256',
      subject: user.id,
      expiresIn: AUTH_POLICY.accessSeconds,
    });
  }

  async login(dto: LoginDto, ip: string) {
    const email = dto.email.trim().toLowerCase();
    await this.limit(
      'login',
      email,
      ip,
      AUTH_POLICY.loginLimit,
      AUTH_POLICY.loginWindowMs,
    );
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !(await argon2.verify(user.passwordHash, dto.password)))
      throw AUTH_INVALID();
    if (user.status === 'SUSPENDED')
      throw authError(423, 'ACCOUNT_SUSPENDED', 'Account is suspended');
    if (user.status !== 'ACTIVE') throw AUTH_INVALID();
    const refreshToken = newToken();
    const session = await this.prisma.refreshSession.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + AUTH_POLICY.refreshMs),
      },
    });
    return {
      accessToken: this.issueAccessToken(user, session.id),
      refreshToken,
      user: this.account(user),
    };
  }

  async refresh(refreshToken: string | undefined) {
    if (!refreshToken) throw AUTH_REQUIRED();
    const record = await this.prisma.refreshSession.findUnique({
      where: { tokenHash: hashToken(refreshToken) },
      include: { user: true },
    });
    if (!record) throw AUTH_INVALID();
    if (record.revokedAt) {
      await this.prisma.refreshSession.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw AUTH_INVALID();
    }
    const now = new Date();
    if (
      record.expiresAt <= now ||
      (record.lastUsedAt || record.createdAt).getTime() +
        AUTH_POLICY.refreshIdleMs <=
        now.getTime()
    ) {
      await this.prisma.refreshSession.updateMany({
        where: { id: record.id, revokedAt: null },
        data: { revokedAt: now },
      });
      throw AUTH_INVALID();
    }
    if (record.user.status === 'SUSPENDED')
      throw authError(423, 'ACCOUNT_SUSPENDED', 'Account is suspended');
    if (record.user.status !== 'ACTIVE') throw AUTH_INVALID();
    const nextToken = newToken();
    const next = await this.prisma.$transaction(async (tx) => {
      const changed = await tx.refreshSession.updateMany({
        where: { id: record.id, revokedAt: null },
        data: { revokedAt: now, lastUsedAt: now },
      });
      if (changed.count !== 1) throw AUTH_INVALID();
      return tx.refreshSession.create({
        data: {
          userId: record.userId,
          tokenHash: hashToken(nextToken),
          expiresAt: record.expiresAt,
          rotatedFromId: record.id,
        },
      });
    });
    return {
      accessToken: this.issueAccessToken(record.user, next.id),
      refreshToken: nextToken,
      user: this.account(record.user),
    };
  }

  async logout(refreshToken: string | undefined): Promise<{ loggedOut: true }> {
    if (refreshToken)
      await this.prisma.refreshSession.updateMany({
        where: { tokenHash: hashToken(refreshToken), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    return { loggedOut: true };
  }

  async forgotPassword(emailInput: string, ip: string) {
    const email = emailInput.trim().toLowerCase();
    await this.limit(
      'forgot',
      email,
      ip,
      AUTH_POLICY.mailLimit,
      AUTH_POLICY.mailWindowMs,
    );
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user && user.status === 'ACTIVE') {
      const token = newToken();
      await this.prisma.verificationToken.create({
        data: {
          userId: user.id,
          purpose: 'RESET_PASSWORD',
          tokenHash: hashToken(token),
          expiresAt: new Date(Date.now() + AUTH_POLICY.resetMs),
        },
      });
      try {
        await this.emailSender.sendReset(email, token);
      } catch {
        /* Generic response avoids account enumeration. */
      }
    }
    return { accepted: true };
  }

  async resetPassword(dto: ResetPasswordDto) {
    validatePassword(dto.newPassword);
    const record = await this.prisma.verificationToken.findUnique({
      where: { tokenHash: hashToken(dto.token) },
    });
    if (
      !record ||
      record.purpose !== 'RESET_PASSWORD' ||
      record.usedAt ||
      record.expiresAt <= new Date()
    ) {
      throw authError(
        HttpStatus.BAD_REQUEST,
        'TOKEN_INVALID',
        'Reset link is invalid or expired',
      );
    }
    const passwordHash = await argon2.hash(dto.newPassword, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
    await this.prisma.$transaction(async (tx) => {
      const used = await tx.verificationToken.updateMany({
        where: { id: record.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });
      if (used.count !== 1)
        throw authError(
          HttpStatus.BAD_REQUEST,
          'TOKEN_INVALID',
          'Reset link is invalid or expired',
        );
      await tx.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      });
      await tx.refreshSession.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });
    return { reset: true };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    validatePassword(dto.newPassword);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !(await argon2.verify(user.passwordHash, dto.currentPassword)))
      throw AUTH_INVALID();
    const passwordHash = await argon2.hash(dto.newPassword, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { passwordHash } });
      await tx.refreshSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });
    return { changed: true };
  }

  async authenticate(header: string | undefined): Promise<AuthPrincipal> {
    if (!header?.startsWith('Bearer ')) throw AUTH_REQUIRED();
    let payload: jwt.JwtPayload;
    try {
      const decoded = jwt.verify(header.slice(7), this.jwtSecret, {
        algorithms: ['HS256'],
      });
      if (typeof decoded === 'string') throw new Error('Invalid token');
      payload = decoded;
    } catch {
      throw AUTH_INVALID();
    }
    if (typeof payload.sub !== 'string' || typeof payload.sid !== 'string')
      throw AUTH_INVALID();
    const session = await this.prisma.refreshSession.findUnique({
      where: { id: payload.sid },
      include: { user: true },
    });
    if (
      !session ||
      session.userId !== payload.sub ||
      session.revokedAt ||
      session.expiresAt <= new Date()
    )
      throw AUTH_INVALID();
    if (session.user.status === 'SUSPENDED')
      throw authError(423, 'ACCOUNT_SUSPENDED', 'Account is suspended');
    if (session.user.status !== 'ACTIVE') throw AUTH_INVALID();
    return {
      userId: session.userId,
      role: session.user.role,
      emailVerified: !!session.user.emailVerifiedAt,
    };
  }

  requireStart(principal: AuthPrincipal | null): void {
    if (!principal) throw AUTH_REQUIRED();
    if (!principal.emailVerified)
      throw authError(
        HttpStatus.FORBIDDEN,
        'EMAIL_UNVERIFIED',
        'Verify email before starting practice',
      );
  }

  requireAdmin(principal: AuthPrincipal): void {
    if (principal.role !== 'ADMIN')
      throw authError(HttpStatus.FORBIDDEN, 'FORBIDDEN', 'Access denied');
  }

  requireOwner(principal: AuthPrincipal, ownerId: string): void {
    if (principal.userId !== ownerId)
      throw authError(
        HttpStatus.FORBIDDEN,
        'OWNERSHIP_REQUIRED',
        'Access denied',
      );
  }
}
