import { BadRequestException, Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import { page, requireUuid } from '../catalog/catalog.service';
import { PrismaService } from '../persistence/prisma.service';

const bad = (message: string): never => {
  throw new BadRequestException({ code: 'INVALID_FILTER', message });
};
function dates(query: Record<string, string>) {
  const parse = (value: string | undefined) => {
    if (value === undefined) return undefined;
    const date = new Date(value);
    if (!/^\d{4}-\d{2}-\d{2}T/.test(value) || !Number.isFinite(date.getTime()))
      bad('Invalid date');
    return date;
  };
  const from = parse(query.from);
  const to = parse(query.to);
  if (from && to && from > to) bad('from must precede to');
  return { from, to };
}

@Injectable()
export class ProgressService {
  constructor(private readonly prisma: PrismaService) {}

  async recordLesson(
    tx: Prisma.TransactionClient,
    userId: string,
    lessonId: string,
    attemptId: string,
    score: number,
    stars: number,
    wpm: number,
    passed: boolean,
    now: Date,
  ) {
    const best = await tx.lessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
    });
    const isBetter =
      best?.bestScore === null ||
      best?.bestScore === undefined ||
      score > best.bestScore;
    await tx.lessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      create: {
        userId,
        lessonId,
        attemptsCount: 1,
        bestScore: score,
        bestStars: stars,
        bestWpm: wpm,
        bestAttemptId: attemptId,
        passedAt: passed ? now : null,
      },
      update: {
        attemptsCount: { increment: 1 },
        ...(isBetter
          ? {
              bestScore: score,
              bestStars: stars,
              bestWpm: wpm,
              bestAttemptId: attemptId,
            }
          : {}),
        ...(!best?.passedAt && passed ? { passedAt: now } : {}),
      },
    });
  }

  async history(
    query: Record<string, string>,
    userId: string,
    requestId: string,
  ) {
    const p = page(
      query,
      ['cursor', 'limit', 'mode', 'status', 'from', 'to'],
      'history',
    );
    const { from, to } = dates(query);
    if (
      query.mode &&
      !['LESSON', 'SPEED_TIME', 'SPEED_WORDS'].includes(query.mode)
    )
      bad('Invalid mode');
    if (
      query.status &&
      ![
        'READY',
        'RUNNING',
        'PAUSED',
        'COMPLETED',
        'FAILED',
        'ABANDONED',
        'EXPIRED',
      ].includes(query.status)
    )
      bad('Invalid status');
    const now = new Date();
    const where: Prisma.PracticeAttemptWhereInput = {
      userId,
      ...(query.mode
        ? { mode: query.mode as Prisma.EnumAttemptModeFilter['equals'] }
        : {}),
      ...(query.status === 'EXPIRED'
        ? {
            OR: [
              { status: 'EXPIRED' },
              {
                status: { in: ['READY', 'RUNNING', 'PAUSED'] },
                expiresAt: { lte: now },
              },
            ],
          }
        : query.status
          ? {
              status: query.status as Prisma.EnumAttemptStatusFilter['equals'],
              ...(['READY', 'RUNNING', 'PAUSED'].includes(query.status)
                ? { expiresAt: { gt: now } }
                : {}),
            }
          : {}),
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    };
    if (
      p.cursor &&
      !(await this.prisma.practiceAttempt.findFirst({
        where: { ...where, id: p.cursor },
      }))
    )
      bad('Invalid cursor');
    const rows = await this.prisma.practiceAttempt.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: p.limit + 1,
      ...(p.cursor ? { cursor: { id: p.cursor }, skip: 1 } : {}),
      include: {
        result: true,
        target: {
          include: {
            lesson: { select: { title: true } },
            speedConfig: { select: { slug: true } },
          },
        },
      },
    });
    const hasMore = rows.length > p.limit;
    const items = rows.slice(0, p.limit).map((row) => ({
      attemptId: row.id,
      targetId: row.targetId,
      mode: row.mode,
      status:
        ['READY', 'RUNNING', 'PAUSED'].includes(row.status) &&
        row.expiresAt <= now
          ? 'EXPIRED'
          : row.status,
      title: row.target.lesson?.title ?? row.target.speedConfig?.slug ?? null,
      createdAt: row.createdAt.toISOString(),
      endedAt: row.endedAt?.toISOString() ?? null,
      result: row.result
        ? {
            verified: row.result.verified,
            eligibleForRanking: row.result.eligibleForRanking,
            effectiveWpm: row.result.effectiveWpm?.toNumber() ?? null,
            firstTryAccuracy: row.result.firstTryAccuracy?.toNumber() ?? null,
            score: row.result.score,
            stars: row.result.stars,
            passed: row.result.passed,
          }
        : row.status === 'ABANDONED'
          ? { score: 0, eligibleForRanking: false }
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

  async stats(query: Record<string, string>, userId: string) {
    page(query, ['from', 'to'], 'stats');
    const { from, to } = dates(query);
    const rows = await this.prisma.practiceAttempt.findMany({
      where: {
        userId,
        status: 'COMPLETED',
        ...(from || to
          ? {
              endedAt: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      include: { result: true, target: { select: { lessonId: true } } },
    });
    const verified = rows.filter((row) => row.result?.verified);
    const measured = verified.filter(
      (row) =>
        row.result?.effectiveWpm !== null &&
        row.result?.firstTryAccuracy !== null,
    );
    const buckets = new Map<
      string,
      { count: number; wpm: number; accuracy: number }
    >();
    for (const row of measured) {
      const day = row.endedAt!.toISOString().slice(0, 10);
      const bucket = buckets.get(day) || { count: 0, wpm: 0, accuracy: 0 };
      bucket.count++;
      bucket.wpm += row.result!.effectiveWpm?.toNumber() ?? 0;
      bucket.accuracy += row.result!.firstTryAccuracy?.toNumber() ?? 0;
      buckets.set(day, bucket);
    }
    const average = (total: number) =>
      measured.length
        ? Math.round((100 * total) / measured.length) / 100
        : null;
    const lessonIds = new Set(
      verified.map((row) => row.target.lessonId).filter(Boolean),
    );
    const passedLessonIds = new Set(
      verified
        .filter((row) => row.result?.passed)
        .map((row) => row.target.lessonId)
        .filter(Boolean),
    );
    const keyRows = verified.length
      ? await this.prisma.practiceKeyStat.findMany({
          where: { attemptId: { in: verified.map((row) => row.id) } },
        })
      : [];
    const keyTotals = new Map<string, { attempts: number; mistakes: number }>();
    for (const row of keyRows) {
      const total = keyTotals.get(row.keyLabel) || { attempts: 0, mistakes: 0 };
      total.attempts += row.attempts;
      total.mistakes += row.mistakes;
      keyTotals.set(row.keyLabel, total);
    }
    return {
      attemptsCompleted: verified.length,
      lessonsPracticed: lessonIds.size,
      lessonsPassed: passedLessonIds.size,
      totalActiveMs: verified.reduce(
        (total, row) => total + Number(row.result!.durationMs ?? 0),
        0,
      ),
      averageWpm: average(
        measured.reduce(
          (total, row) => total + (row.result!.effectiveWpm?.toNumber() ?? 0),
          0,
        ),
      ),
      averageFirstTryAccuracy: average(
        measured.reduce(
          (total, row) =>
            total + (row.result!.firstTryAccuracy?.toNumber() ?? 0),
          0,
        ),
      ),
      chart: [...buckets]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([day, bucket]) => ({
          day,
          attempts: bucket.count,
          averageWpm: Math.round((100 * bucket.wpm) / bucket.count) / 100,
          averageFirstTryAccuracy:
            Math.round((100 * bucket.accuracy) / bucket.count) / 100,
        })),
      weakKeys: [...keyTotals]
        .filter(([, total]) => total.attempts >= 5)
        .map(([key, total]) => ({
          key,
          attempts: total.attempts,
          mistakeRate:
            Math.round((10000 * total.mistakes) / total.attempts) / 100,
        }))
        .sort((a, b) => b.mistakeRate - a.mistakeRate)
        .slice(0, 10),
      empty: verified.length === 0,
    };
  }

  async lessons(
    query: Record<string, string>,
    userId: string,
    requestId: string,
  ) {
    const p = page(query, ['courseId', 'cursor', 'limit'], 'progress');
    if (query.courseId) requireUuid(query.courseId);
    const where: Prisma.LessonProgressWhereInput = {
      userId,
      lesson: {
        status: 'PUBLISHED',
        isActive: true,
        course: { status: 'PUBLISHED' },
        ...(query.courseId ? { courseId: query.courseId } : {}),
      },
    };
    if (
      p.cursor &&
      !(await this.prisma.lessonProgress.findFirst({
        where: { ...where, lessonId: p.cursor },
      }))
    )
      bad('Invalid cursor');
    const rows = await this.prisma.lessonProgress.findMany({
      where,
      orderBy: [{ lesson: { courseOrdinal: 'asc' } }, { lessonId: 'asc' }],
      take: p.limit + 1,
      ...(p.cursor
        ? {
            cursor: { userId_lessonId: { userId, lessonId: p.cursor } },
            skip: 1,
          }
        : {}),
      include: {
        lesson: {
          select: { title: true, courseId: true, courseOrdinal: true },
        },
      },
    });
    const hasMore = rows.length > p.limit;
    const items = rows.slice(0, p.limit).map((row) => ({
      lessonId: row.lessonId,
      courseId: row.lesson.courseId,
      title: row.lesson.title,
      courseOrdinal: row.lesson.courseOrdinal,
      bestScore: row.bestScore,
      bestStars: row.bestStars,
      bestWpm: row.bestWpm?.toNumber() ?? null,
      bestAttemptId: row.bestAttemptId,
      passedAt: row.passedAt?.toISOString() ?? null,
      attemptsCount: row.attemptsCount,
    }));
    return {
      data: { items },
      meta: {
        requestId,
        hasMore,
        nextCursor: hasMore ? p.next(rows[p.limit - 1].lessonId) : null,
      },
    };
  }
}
