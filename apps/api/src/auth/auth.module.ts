import { Module } from '@nestjs/common';
import { AuthController, MeController } from './auth.controller';
import { AccessGuard, AdminGuard, StartGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { EMAIL_SENDER, SmtpEmailSender } from './email.sender';

@Module({
  controllers: [AuthController, MeController],
  providers: [
    AuthService,
    AccessGuard,
    AdminGuard,
    StartGuard,
    { provide: EMAIL_SENDER, useClass: SmtpEmailSender },
  ],
  exports: [AuthService, AccessGuard, AdminGuard, StartGuard],
})
export class AuthModule {}
