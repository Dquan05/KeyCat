import {
  Controller,
  Get,
  Inject,
  Req,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from './persistence/prisma.service';

type RequestWithId = { requestId: string };

@Controller('health')
export class HealthController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get()
  async check(@Req() request: RequestWithId) {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException('Database unavailable');
    }

    return {
      data: { status: 'ok', database: 'connected' },
      meta: { requestId: request.requestId },
    };
  }
}
