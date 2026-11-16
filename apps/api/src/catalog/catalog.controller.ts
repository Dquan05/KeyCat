import {
  Controller,
  Get,
  Inject,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AccessGuard, type AuthenticatedRequest } from '../auth/auth.guard';
import { CatalogService } from './catalog.service';

type RequestContext = AuthenticatedRequest & { requestId: string };

@Controller()
@UseGuards(AccessGuard)
export class CatalogController {
  constructor(
    @Inject(CatalogService) private readonly catalog: CatalogService,
  ) {}

  @Get('courses')
  async courses(
    @Query() query: Record<string, string>,
    @Req() request: RequestContext,
  ) {
    return this.catalog.courses(query, request.requestId);
  }

  @Get('courses/:courseId/sections')
  async sections(
    @Param('courseId') courseId: string,
    @Query() query: Record<string, string>,
    @Req() request: RequestContext,
  ) {
    return this.catalog.sections(courseId, query, request.requestId);
  }

  @Get('lessons')
  async lessons(
    @Query() query: Record<string, string>,
    @Req() request: RequestContext,
  ) {
    return this.catalog.lessons(
      query,
      request.principal!.userId,
      request.requestId,
    );
  }

  @Get('lessons/:lessonId')
  async lesson(
    @Param('lessonId') lessonId: string,
    @Req() request: RequestContext,
  ) {
    return {
      data: await this.catalog.lesson(lessonId, request.principal!.userId),
      meta: { requestId: request.requestId },
    };
  }
}
