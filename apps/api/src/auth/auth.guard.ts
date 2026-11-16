import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { AuthService, type AuthPrincipal } from './auth.service';

export type AuthenticatedRequest = {
  headers: { authorization?: string };
  principal?: AuthPrincipal;
};

@Injectable()
export class AccessGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    request.principal = await this.auth.authenticate(
      request.headers.authorization,
    );
    return true;
  }
}

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    this.auth.requireAdmin(request.principal!);
    return true;
  }
}

@Injectable()
export class StartGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    this.auth.requireStart(request.principal || null);
    return true;
  }
}
