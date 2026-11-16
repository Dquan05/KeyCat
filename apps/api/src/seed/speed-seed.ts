import { createHash } from 'node:crypto';
import { PrismaClient } from '../generated/prisma/client';
import { SPEED_GENERATOR_VERSION } from '../../../../packages/typing-core/dist/index';

// Original KeyCat practice vocabulary. No third-party quotations or copied passages.
export const SPEED_WORDS = [
  'able',
  'about',
  'above',
  'after',
  'again',
  'answer',
  'around',
  'basic',
  'before',
  'begin',
  'better',
  'between',
  'bright',
  'build',
  'change',
  'clear',
  'close',
  'cloud',
  'common',
  'create',
  'daily',
  'data',
  'design',
  'early',
  'enough',
  'every',
  'focus',
  'follow',
  'future',
  'garden',
  'gentle',
  'green',
  'group',
  'happy',
  'help',
  'home',
  'idea',
  'inside',
  'learn',
  'letter',
  'light',
  'listen',
  'little',
  'local',
  'make',
  'memory',
  'method',
  'morning',
  'move',
  'nature',
  'near',
  'never',
  'number',
  'open',
  'paper',
  'people',
  'place',
  'plan',
  'point',
  'practice',
  'quiet',
  'ready',
  'result',
  'right',
  'simple',
  'small',
  'space',
  'start',
  'study',
  'system',
  'table',
  'think',
  'time',
  'today',
  'under',
  'value',
  'voice',
  'water',
  'window',
  'word',
  'work',
  'write',
] as const;

export const SPEED_POOL_VERSION = 'keycat-words-v1';
const poolText = SPEED_WORDS.join(' ');
const poolHash = createHash('sha256').update(poolText).digest('hex');

export async function seedSpeedConfigs(prisma: PrismaClient): Promise<void> {
  await prisma.$transaction(async (tx) => {
    for (const [mode, presets] of [
      ['TIME', [60, 120]],
      ['WORDS', [25, 50, 100]],
    ] as const) {
      for (const preset of presets) {
        for (const punctuationEnabled of [false, true]) {
          for (const numbersEnabled of [false, true]) {
            const slug = `speed-${mode.toLowerCase()}-${preset}-${Number(punctuationEnabled)}-${Number(numbersEnabled)}`;
            const config = await tx.speedTestConfig.upsert({
              where: { slug },
              create: {
                slug,
                mode,
                timeLimitSec: mode === 'TIME' ? preset : null,
                wordTarget: mode === 'WORDS' ? preset : null,
                punctuationEnabled,
                numbersEnabled,
                wordPoolVersion: SPEED_POOL_VERSION,
                generatorVersion: SPEED_GENERATOR_VERSION,
                status: 'PUBLISHED',
              },
              update: {},
            });
            if (
              config.mode !== mode ||
              config.timeLimitSec !== (mode === 'TIME' ? preset : null) ||
              config.wordTarget !== (mode === 'WORDS' ? preset : null) ||
              config.punctuationEnabled !== punctuationEnabled ||
              config.numbersEnabled !== numbersEnabled ||
              config.wordPoolVersion !== SPEED_POOL_VERSION ||
              config.generatorVersion !== SPEED_GENERATOR_VERSION
            )
              throw new Error(`Speed config conflict: ${slug}`);
            const target = await tx.practiceTarget.upsert({
              where: { speedConfigId: config.id },
              create: { kind: 'SPEED_TEST', speedConfigId: config.id },
              update: {},
            });
            const version = await tx.contentVersion.upsert({
              where: {
                targetId_versionNo: { targetId: target.id, versionNo: 1 },
              },
              create: {
                targetId: target.id,
                versionNo: 1,
                contentKind: 'SPEED_CONFIG',
                contentText: poolText,
                contentHash: poolHash,
                configJson: {
                  mode,
                  preset,
                  punctuationEnabled,
                  numbersEnabled,
                  wordPoolVersion: SPEED_POOL_VERSION,
                  generatorVersion: SPEED_GENERATOR_VERSION,
                },
                sourceName: 'KeyCat Original',
                license: 'CC0-1.0',
                attribution: 'KeyCat',
                publishedAt: new Date(),
              },
              update: {},
            });
            if (
              version.contentHash !== poolHash ||
              version.contentText !== poolText
            )
              throw new Error(`Speed content conflict: ${slug}`);
            if (!target.currentContentVersionId)
              await tx.practiceTarget.update({
                where: { id: target.id },
                data: { currentContentVersionId: version.id },
              });
          }
        }
      }
    }
  });
}
