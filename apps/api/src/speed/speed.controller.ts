import { Controller, Get, Inject, Query, Req, UseGuards } from '@nestjs/common';
import { AccessGuard, type AuthenticatedRequest } from '../auth/auth.guard';
import { SpeedService } from './speed.service';

type RequestContext = AuthenticatedRequest & { requestId: string };

@Controller()
@UseGuards(AccessGuard)
export class SpeedController {
  constructor(@Inject(SpeedService) private readonly speed: SpeedService) {}

  @Get('speed-test/configs')
  async configs(
    @Query() query: Record<string, string>,
    @Req() request: RequestContext,
  ) {
    return {
      data: { items: await this.speed.configs(query) },
      meta: { requestId: request.requestId },
    };
  }

  @Get('games')
  async games(@Req() request: RequestContext) {
    const configs = await this.speed.configs({});
    return {
      data: { items: [{ key: 'SPEED_TEST', available: configs.length > 0 }] },
      meta: { requestId: request.requestId },
    };
  }
}
