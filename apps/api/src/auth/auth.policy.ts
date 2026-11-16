import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common';

export const AUTH_POLICY = {
  passwordMin: 15,
  passwordMax: 128,
  verifyMs: 24 * 60 * 60_000,
  resetMs: 30 * 60_000,
  accessSeconds: 15 * 60,
  refreshMs: 7 * 24 * 60 * 60_000,
  refreshIdleMs: 24 * 60 * 60_000,
  loginLimit: 10,
  loginWindowMs: 15 * 60_000,
  mailLimit: 3,
  mailWindowMs: 60 * 60_000,
} as const;

export function validatePassword(password: string): void {
  const length = Array.from(password).length;
  if (length < AUTH_POLICY.passwordMin || length > AUTH_POLICY.passwordMax) {
    throw new BadRequestException({
      code: 'VALIDATION_ERROR',
      message: 'Password must be 15–128 characters.',
    });
  }
}

export function authError(
  status: number,
  code: string,
  message: string,
): HttpException {
  return new HttpException({ code, message }, status);
}

export const AUTH_REQUIRED = () =>
  authError(
    HttpStatus.UNAUTHORIZED,
    'AUTH_REQUIRED',
    'Authentication required',
  );
export const AUTH_INVALID = () =>
  authError(
    HttpStatus.UNAUTHORIZED,
    'AUTH_INVALID',
    'Invalid credentials or session',
  );
