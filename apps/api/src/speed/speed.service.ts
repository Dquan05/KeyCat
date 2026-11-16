import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../persistence/prisma.service';

export const TIME_PRESETS = [60, 120] as const;
export const WORD_PRESETS = [25, 50, 100] as const;
export function approvedSpeedConfig(config: {
  mode: 'TIME' | 'WORDS';
  timeLimitSec: number | null;
  wordTarget: number | null;
}): boolean {
  return config.mode === 'TIME'
    ? config.timeLimitSec !== null &&
        TIME_PRESETS.includes(config.timeLimitSec as 60 | 120) &&
        config.wordTarget === null
    : config.wordTarget !== null &&
        WORD_PRESETS.includes(config.wordTarget as 25 | 50 | 100) &&
        config.timeLimitSec === null;
}

@Injectable()
export class SpeedService {
  constructor(private readonly prisma: PrismaService) {}

  async configs(query: Record<string, string>) {
    if (
      Object.keys(query).some((key) => key !== 'mode') ||
      (query.mode !== undefined && !['TIME', 'WORDS'].includes(query.mode))
    )
      throw new BadRequestException({
        code: 'INVALID_FILTER',
        message: 'Invalid speed mode',
      });
    const rows = await this.prisma.speedTestConfig.findMany({
      where: {
        status: 'PUBLISHED',
        ...(query.mode ? { mode: query.mode as 'TIME' | 'WORDS' } : {}),
      },
      orderBy: [
        { mode: 'asc' },
        { timeLimitSec: 'asc' },
        { wordTarget: 'asc' },
        { punctuationEnabled: 'asc' },
        { numbersEnabled: 'asc' },
        { id: 'asc' },
      ],
      include: { practiceTarget: true },
    });
    return rows
      .filter(
        (row) =>
          approvedSpeedConfig(row) &&
          !!row.practiceTarget?.currentContentVersionId,
      )
      .map((row) => ({
        id: row.id,
        practiceTargetId: row.practiceTarget!.id,
        mode: row.mode,
        timeLimitSec: row.timeLimitSec,
        wordTarget: row.wordTarget,
        punctuationEnabled: row.punctuationEnabled,
        numbersEnabled: row.numbersEnabled,
        wordPoolVersion: row.wordPoolVersion,
        generatorVersion: row.generatorVersion,
      }));
  }
}
