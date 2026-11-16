import { Controller, Get, Inject, Query, Req, UseGuards } from '@nestjs/common';
import { AccessGuard, type AuthenticatedRequest } from '../auth/auth.guard';
import { ProgressService } from './progress.service';

type RequestContext = AuthenticatedRequest & { requestId: string };

@Controller('me')
@UseGuards(AccessGuard)
export class ProgressController {
  constructor(
    @Inject(ProgressService) private readonly progress: ProgressService,
  ) {}

  @Get('history')
  async history(
    @Query() query: Record<string, string>,
    @Req() request: RequestContext,
  ) {
    return this.progress.history(
      query,
      request.principal!.userId,
      request.requestId,
    );
  }

  @Get('stats')
  async stats(
    @Query() query: Record<string, string>,
    @Req() request: RequestContext,
  ) {
    return {
      data: await this.progress.stats(query, request.principal!.userId),
      meta: { requestId: request.requestId },
    };
  }

  @Get('progress')
  async lessons(
    @Query() query: Record<string, string>,
    @Req() request: RequestContext,
  ) {
    return this.progress.lessons(
      query,
      request.principal!.userId,
      request.requestId,
    );
  }
}
