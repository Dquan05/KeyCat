import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Inject,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  AccessGuard,
  StartGuard,
  type AuthenticatedRequest,
} from '../auth/auth.guard';
import { PracticeService } from './practice.service';

type RequestContext = AuthenticatedRequest & { requestId: string };
const envelope = (data: unknown, request: RequestContext) => ({
  data,
  meta: { requestId: request.requestId },
});

@Controller('practice/attempts')
@UseGuards(AccessGuard)
export class PracticeController {
  constructor(
    @Inject(PracticeService) private readonly practice: PracticeService,
  ) {}

  @Post()
  @UseGuards(StartGuard)
  async start(@Body() body: unknown, @Req() request: RequestContext) {
    return envelope(
      await this.practice.start(body, request.principal!.userId),
      request,
    );
  }

  @Post(':attemptId/finish')
  @HttpCode(200)
  async finish(
    @Param('attemptId') attemptId: string,
    @Headers('idempotency-key') key: string | undefined,
    @Body() body: unknown,
    @Req() request: RequestContext,
  ) {
    return envelope(
      await this.practice.finish(attemptId, key, body, request.principal!),
      request,
    );
  }

  @Post(':attemptId/abandon')
  @HttpCode(200)
  async abandon(
    @Param('attemptId') attemptId: string,
    @Headers('idempotency-key') key: string | undefined,
    @Body() body: unknown,
    @Req() request: RequestContext,
  ) {
    return envelope(
      await this.practice.abandon(attemptId, key, body, request.principal!),
      request,
    );
  }

  @Get(':attemptId')
  async attempt(
    @Param('attemptId') attemptId: string,
    @Req() request: RequestContext,
  ) {
    return envelope(
      await this.practice.attempt(attemptId, request.principal!),
      request,
    );
  }
}
