import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  Patch,
  Req,
  Res,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { AuthService, type AuthPrincipal } from './auth.service';
import {
  ChangePasswordDto,
  EmailDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  TokenDto,
  UpdateProfileDto,
  UpdateSettingsDto,
} from './auth.dto';
import { AccessGuard } from './auth.guard';
import { authError } from './auth.policy';

type RequestContext = {
  ip?: string;
  headers: { origin?: string };
  cookies?: Record<string, string>;
  requestId: string;
  principal?: AuthPrincipal;
};
type CookieResponse = {
  cookie(name: string, value: string, options: Record<string, unknown>): void;
  clearCookie(name: string, options: Record<string, unknown>): void;
};

const COOKIE_NAME = 'keycat-refresh';
const cookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.WEB_ORIGIN?.startsWith('https://') || false,
  path: '/api/v1/auth',
  maxAge: 7 * 24 * 60 * 60_000,
});
const envelope = (data: unknown, request: RequestContext) => ({
  data,
  meta: { requestId: request.requestId },
});
const ipOf = (request: RequestContext) => request.ip || 'unknown';

function checkCookieOrigin(request: RequestContext): void {
  const expected = process.env.WEB_ORIGIN?.replace(/\/$/, '');
  if (!expected || request.headers.origin !== expected)
    throw authError(
      HttpStatus.FORBIDDEN,
      'CSRF_REJECTED',
      'Request origin denied',
    );
}

@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Post('register')
  async register(@Body() body: RegisterDto, @Req() request: RequestContext) {
    return envelope(await this.auth.register(body, ipOf(request)), request);
  }

  @Post('verify-email')
  @HttpCode(200)
  async verifyEmail(@Body() body: TokenDto, @Req() request: RequestContext) {
    return envelope(await this.auth.verifyEmail(body.token), request);
  }

  @Post('resend-verification')
  @HttpCode(202)
  async resend(@Body() body: EmailDto, @Req() request: RequestContext) {
    return envelope(
      await this.auth.resendVerification(body.email, ipOf(request)),
      request,
    );
  }

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() body: LoginDto,
    @Req() request: RequestContext,
    @Res({ passthrough: true }) response: CookieResponse,
  ) {
    const result = await this.auth.login(body, ipOf(request));
    response.cookie(COOKIE_NAME, result.refreshToken, cookieOptions());
    return envelope(
      { accessToken: result.accessToken, user: result.user },
      request,
    );
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() request: RequestContext,
    @Res({ passthrough: true }) response: CookieResponse,
  ) {
    checkCookieOrigin(request);
    const result = await this.auth.refresh(request.cookies?.[COOKIE_NAME]);
    response.cookie(COOKIE_NAME, result.refreshToken, cookieOptions());
    return envelope(
      { accessToken: result.accessToken, user: result.user },
      request,
    );
  }

  @Post('logout')
  @HttpCode(200)
  async logout(
    @Req() request: RequestContext,
    @Res({ passthrough: true }) response: CookieResponse,
  ) {
    checkCookieOrigin(request);
    const result = await this.auth.logout(request.cookies?.[COOKIE_NAME]);
    response.clearCookie(COOKIE_NAME, cookieOptions());
    return envelope(result, request);
  }

  @Post('forgot-password')
  @HttpCode(202)
  async forgot(@Body() body: EmailDto, @Req() request: RequestContext) {
    return envelope(
      await this.auth.forgotPassword(body.email, ipOf(request)),
      request,
    );
  }

  @Post('reset-password')
  @HttpCode(200)
  async reset(@Body() body: ResetPasswordDto, @Req() request: RequestContext) {
    return envelope(await this.auth.resetPassword(body), request);
  }
}

@Controller('me')
export class MeController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Get()
  @UseGuards(AccessGuard)
  async profile(@Req() request: RequestContext) {
    return envelope(await this.auth.getMe(request.principal!.userId), request);
  }

  @Patch()
  @UseGuards(AccessGuard)
  async updateProfile(
    @Body() body: UpdateProfileDto,
    @Req() request: RequestContext,
  ) {
    return envelope(
      await this.auth.updateProfile(request.principal!.userId, body),
      request,
    );
  }

  @Get('settings')
  @UseGuards(AccessGuard)
  async settings(@Req() request: RequestContext) {
    return envelope(
      await this.auth.getSettings(request.principal!.userId),
      request,
    );
  }

  @Patch('settings')
  @UseGuards(AccessGuard)
  async updateSettings(
    @Body() body: UpdateSettingsDto,
    @Req() request: RequestContext,
  ) {
    return envelope(
      await this.auth.updateSettings(request.principal!.userId, body),
      request,
    );
  }

  @Post('password')
  @HttpCode(200)
  @UseGuards(AccessGuard)
  async password(
    @Body() body: ChangePasswordDto,
    @Req() request: RequestContext,
  ) {
    return envelope(
      await this.auth.changePassword(request.principal!.userId, body),
      request,
    );
  }
}
