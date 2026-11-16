import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../persistence/prisma.service';

const uuid =
  /^[\da-f]{8}-[\da-f]{4}-[1-8][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i;
const fail = (message: string): never => {
  throw new BadRequestException({ code: 'INVALID_FILTER', message });
};
export function requireUuid(value: string): string {
  if (!uuid.test(value)) return fail('Invalid UUID');
  return value;
}

type Cursor = { v: 1; scope: string; filter: string; id: string };
export function page(
  query: Record<string, string>,
  allowed: string[],
  scope: string,
) {
  for (const key of Object.keys(query))
    if (!allowed.includes(key) || typeof query[key] !== 'string')
      fail('Unsupported filter');
  const limit = query.limit === undefined ? 20 : Number(query.limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100)
    fail('Invalid limit');
  const filters = Object.fromEntries(
    Object.entries(query)
      .filter(([key]) => key !== 'cursor' && key !== 'limit')
      .sort(),
  );
  const filter = createHash('sha256')
    .update(JSON.stringify(filters))
    .digest('hex');
  let cursor: string | undefined;
  if (query.cursor !== undefined) {
    if (!query.cursor) fail('Invalid cursor');
    try {
      const parsed = JSON.parse(
        Buffer.from(query.cursor, 'base64url').toString(),
      ) as Cursor;
      if (
        parsed.v !== 1 ||
        parsed.scope !== scope ||
        parsed.filter !== filter ||
        !uuid.test(parsed.id)
      )
        fail('Invalid cursor');
      cursor = parsed.id;
    } catch {
      fail('Invalid cursor');
    }
  }
  return {
    limit,
    cursor,
    next: (id: string) =>
      Buffer.from(JSON.stringify({ v: 1, scope, filter, id })).toString(
        'base64url',
      ),
  };
}

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async courses(query: Record<string, string>, requestId: string) {
    const p = page(query, ['cursor', 'limit', 'status'], 'courses');
    if (query.status && query.status !== 'PUBLISHED')
      fail('Only published status is available');
    const where: Prisma.CourseWhereInput = { status: 'PUBLISHED' };
    if (
      p.cursor &&
      !(await this.prisma.course.findFirst({
        where: { ...where, id: p.cursor },
      }))
    )
      fail('Invalid cursor');
    const rows = await this.prisma.course.findMany({
      where,
      orderBy: [{ title: 'asc' }, { id: 'asc' }],
      take: p.limit + 1,
      ...(p.cursor ? { cursor: { id: p.cursor }, skip: 1 } : {}),
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        locale: true,
      },
    });
    const hasMore = rows.length > p.limit;
    const items = rows.slice(0, p.limit);
    return {
      data: { items },
      meta: {
        requestId,
        hasMore,
        nextCursor: hasMore ? p.next(items.at(-1)!.id) : null,
      },
    };
  }

  async sections(
    courseId: string,
    query: Record<string, string>,
    requestId: string,
  ) {
    requireUuid(courseId);
    const p = page(query, ['cursor', 'limit'], `sections:${courseId}`);
    if (
      !(await this.prisma.course.findFirst({
        where: { id: courseId, status: 'PUBLISHED' },
      }))
    )
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Course not found',
      });
    const where: Prisma.SectionWhereInput = { courseId };
    if (
      p.cursor &&
      !(await this.prisma.section.findFirst({
        where: { ...where, id: p.cursor },
      }))
    )
      fail('Invalid cursor');
    const rows = await this.prisma.section.findMany({
      where,
      orderBy: [{ orderIndex: 'asc' }, { id: 'asc' }],
      take: p.limit + 1,
      ...(p.cursor ? { cursor: { id: p.cursor }, skip: 1 } : {}),
      select: { id: true, courseId: true, title: true, orderIndex: true },
    });
    const hasMore = rows.length > p.limit;
    const items = rows.slice(0, p.limit);
    return {
      data: { items },
      meta: {
        requestId,
        hasMore,
        nextCursor: hasMore ? p.next(items.at(-1)!.id) : null,
      },
    };
  }

  async lessons(
    query: Record<string, string>,
    userId: string,
    requestId: string,
  ) {
    const p = page(
      query,
      ['cursor', 'limit', 'courseId', 'sectionId', 'lessonType'],
      'lessons',
    );
    if (query.courseId) requireUuid(query.courseId);
    if (query.sectionId) requireUuid(query.sectionId);
    if (
      query.lessonType &&
      !['INTRO', 'KEY_DRILL', 'REVIEW', 'PRACTICE'].includes(query.lessonType)
    )
      fail('Invalid lessonType');
    const where: Prisma.LessonWhereInput = {
      status: 'PUBLISHED',
      isActive: true,
      course: { status: 'PUBLISHED' },
      ...(query.courseId ? { courseId: query.courseId } : {}),
      ...(query.sectionId ? { sectionId: query.sectionId } : {}),
      ...(query.lessonType
        ? {
            lessonType:
              query.lessonType as Prisma.EnumLessonTypeFilter['equals'],
          }
        : {}),
    };
    if (
      p.cursor &&
      !(await this.prisma.lesson.findFirst({
        where: { ...where, id: p.cursor },
      }))
    )
      fail('Invalid cursor');
    const rows = await this.prisma.lesson.findMany({
      where,
      orderBy: [{ courseOrdinal: 'asc' }, { id: 'asc' }],
      take: p.limit + 1,
      ...(p.cursor ? { cursor: { id: p.cursor }, skip: 1 } : {}),
      include: {
        practiceTarget: true,
        progress: { where: { userId }, take: 1 },
      },
    });
    const hasMore = rows.length > p.limit;
    const items = rows.slice(0, p.limit).map((row) => ({
      id: row.id,
      courseId: row.courseId,
      sectionId: row.sectionId,
      title: row.title,
      lessonType: row.lessonType,
      courseOrdinal: row.courseOrdinal,
      goalWpm: row.goalWpm?.toNumber() ?? null,
      minAccuracy: row.minAccuracy?.toNumber() ?? null,
      practiceTargetId: row.practiceTarget?.id ?? null,
      best: row.progress[0]
        ? {
            stars: row.progress[0].bestStars,
            effectiveWpm: row.progress[0].bestWpm?.toNumber() ?? null,
          }
        : null,
    }));
    return {
      data: { items },
      meta: {
        requestId,
        hasMore,
        nextCursor: hasMore ? p.next(rows[p.limit - 1].id) : null,
      },
    };
  }

  async lesson(lessonId: string, userId: string) {
    requireUuid(lessonId);
    const row = await this.prisma.lesson.findFirst({
      where: {
        id: lessonId,
        status: 'PUBLISHED',
        isActive: true,
        course: { status: 'PUBLISHED' },
      },
      include: {
        practiceTarget: true,
        progress: { where: { userId }, take: 1 },
      },
    });
    if (!row)
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Lesson not found',
      });
    return {
      id: row.id,
      courseId: row.courseId,
      sectionId: row.sectionId,
      title: row.title,
      lessonType: row.lessonType,
      courseOrdinal: row.courseOrdinal,
      goalWpm: row.goalWpm?.toNumber() ?? null,
      minAccuracy: row.minAccuracy?.toNumber() ?? null,
      minPassWpm: row.minPassWpm?.toNumber() ?? null,
      practiceTargetId: row.practiceTarget?.id ?? null,
      available: !!row.practiceTarget?.currentContentVersionId,
      best: row.progress[0]
        ? {
            stars: row.progress[0].bestStars,
            score: row.progress[0].bestScore,
            effectiveWpm: row.progress[0].bestWpm?.toNumber() ?? null,
            attemptsCount: row.progress[0].attemptsCount,
          }
        : null,
    };
  }
}
