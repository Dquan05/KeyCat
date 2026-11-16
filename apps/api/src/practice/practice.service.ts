import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  PayloadTooLargeException,
} from '@nestjs/common';
import { createHash, randomInt } from 'node:crypto';
import {
  InvalidEvent,
  MAX_EVENTS,
  MAX_PROOF_BYTES,
  SPEED_GENERATOR_VERSION,
  TYPING_CORE_VERSION,
  generateSpeedText,
  metrics,
  replayEvents,
  scoreLesson,
  type TypingEvent,
} from '../../../../packages/typing-core/dist/index';
import type { AuthPrincipal } from '../auth/auth.service';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../persistence/prisma.service';
import { requireUuid } from '../catalog/catalog.service';
import { ProgressService } from '../progress/progress.service';
import { approvedSpeedConfig } from '../speed/speed.service';

const ATTEMPT_TTL_MS = 30 * 60_000;
type TextSnapshot = {
  kind: 'TEXT';
  text: string;
  contentHash: string;
  goalWpm: number;
  minAccuracy: number;
  minPassWpm: number;
  keyboardLayout: 'US_QWERTY';
};
type IntroSnapshot = {
  kind: 'INTRO';
  text: string;
  contentHash: string;
  keyboardLayout: 'US_QWERTY';
};
type SpeedSnapshot = {
  kind: 'SPEED';
  text: string;
  contentHash: string;
  keyboardLayout: 'US_QWERTY';
  mode: 'SPEED_TIME' | 'SPEED_WORDS';
  preset: number;
  seed: number;
  wordPoolVersion: string;
  generatorVersion: string;
  punctuationEnabled: boolean;
  numbersEnabled: boolean;
};
type Snapshot = TextSnapshot | IntroSnapshot | SpeedSnapshot;
type Proof = { eventLogVersion: 1; events: TypingEvent[] };
type IntroProof = { eventLogVersion: 2; acknowledged: true };

const error = (status: number, code: string, message: string) =>
  new HttpException({ code, message }, status);
const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const sha256 = (value: string) =>
  createHash('sha256').update(value).digest('hex');
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (object(value))
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stable(value[key])}`)
      .join(',')}}`;
  return JSON.stringify(value);
}
function snapshot(value: Prisma.JsonValue): Snapshot {
  if (
    !object(value) ||
    !['TEXT', 'INTRO', 'SPEED'].includes(String(value.kind)) ||
    typeof value.text !== 'string' ||
    typeof value.contentHash !== 'string' ||
    value.keyboardLayout !== 'US_QWERTY' ||
    (value.kind === 'TEXT' &&
      (typeof value.goalWpm !== 'number' ||
        typeof value.minAccuracy !== 'number' ||
        typeof value.minPassWpm !== 'number')) ||
    (value.kind === 'SPEED' &&
      (typeof value.preset !== 'number' ||
        typeof value.seed !== 'number' ||
        typeof value.wordPoolVersion !== 'string' ||
        value.generatorVersion !== SPEED_GENERATOR_VERSION ||
        typeof value.punctuationEnabled !== 'boolean' ||
        typeof value.numbersEnabled !== 'boolean' ||
        !['SPEED_TIME', 'SPEED_WORDS'].includes(String(value.mode))))
  )
    throw error(422, 'POLICY_MISMATCH', 'Invalid attempt snapshot');
  return value as Snapshot;
}
function proof(value: unknown): Proof {
  if (
    !object(value) ||
    value.eventLogVersion !== 1 ||
    !Array.isArray(value.events)
  )
    throw error(400, 'INVALID_EVENT_LOG', 'Invalid event log');
  if (
    value.events.length > MAX_EVENTS ||
    Buffer.byteLength(JSON.stringify(value)) > MAX_PROOF_BYTES
  )
    throw new PayloadTooLargeException({
      code: 'EVENT_LOG_TOO_LARGE',
      message: 'Event log too large',
    });
  for (const event of value.events) {
    if (
      !object(event) ||
      !Number.isInteger(event.seq) ||
      !Number.isInteger(event.activeTimeMs) ||
      !['INSERT', 'BACKSPACE', 'PAUSE', 'RESUME', 'TIMEOUT'].includes(
        String(event.kind),
      ) ||
      (event.kind === 'INSERT' && typeof event.char !== 'string') ||
      (event.shift !== undefined && typeof event.shift !== 'boolean') ||
      (event.capsLock !== undefined && typeof event.capsLock !== 'boolean') ||
      Object.keys(event).some(
        (key) =>
          ![
            'seq',
            'kind',
            'char',
            'activeTimeMs',
            'shift',
            'capsLock',
          ].includes(key),
      )
    )
      throw error(400, 'INVALID_EVENT_LOG', 'Invalid event');
  }
  return value as Proof;
}
function finishProof(value: unknown): Proof | IntroProof {
  if (object(value) && value.eventLogVersion === 2) {
    if (
      value.acknowledged !== true ||
      Object.keys(value).some(
        (key) => !['eventLogVersion', 'acknowledged'].includes(key),
      )
    )
      throw error(400, 'INVALID_EVENT_LOG', 'Invalid INTRO acknowledgment');
    return value as IntroProof;
  }
  return proof(value);
}
function keyOf(value: string | undefined): string {
  if (!value || value.length > 160 || !/^[\x21-\x7e]+$/.test(value))
    throw new BadRequestException({
      code: 'VALIDATION_ERROR',
      message: 'Idempotency-Key is required',
    });
  return value;
}
function retryableTransactionError(cause: unknown): boolean {
  if (!object(cause)) return false;
  if (cause.code === 'P2034') return true;
  if (cause.code !== 'P2010' || !object(cause.meta)) return false;
  const adapter = cause.meta.driverAdapterError;
  if (!object(adapter) || !object(adapter.cause)) return false;
  return ['40001', '40P01'].includes(String(adapter.cause.originalCode));
}

@Injectable()
export class PracticeService implements OnModuleInit, OnModuleDestroy {
  private cleanupTimer?: ReturnType<typeof setInterval>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly progress: ProgressService,
  ) {}

  onModuleInit(): void {
    void this.prunePartialSnapshots().catch(() => undefined);
    this.cleanupTimer = setInterval(() => {
      void this.prunePartialSnapshots().catch(() => undefined);
    }, 60 * 60_000);
    this.cleanupTimer.unref();
  }

  onModuleDestroy(): void {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
  }

  async prunePartialSnapshots(): Promise<number> {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60_000);
    const deleted = await this.prisma.practicePartialSnapshot.deleteMany({
      where: { capturedAt: { lt: cutoff } },
    });
    return deleted.count;
  }

  async start(body: unknown, userId: string) {
    if (
      !object(body) ||
      typeof body.targetId !== 'string' ||
      !['LESSON', 'SPEED_TIME', 'SPEED_WORDS'].includes(
        String(body.requestedMode),
      ) ||
      Object.keys(body).some(
        (key) =>
          !['targetId', 'requestedMode', 'deviceSupported'].includes(key),
      ) ||
      (body.deviceSupported !== undefined &&
        typeof body.deviceSupported !== 'boolean')
    )
      throw new BadRequestException({
        code: 'INVALID_MODE',
        message: 'Invalid Start request',
      });
    requireUuid(body.targetId);
    if (body.deviceSupported === false)
      throw error(
        403,
        'UNSUPPORTED_DEVICE',
        'This device cannot start ranked practice',
      );
    const target = await this.prisma.practiceTarget.findUnique({
      where: { id: body.targetId },
      include: { lesson: { include: { course: true } }, speedConfig: true },
    });
    if (!target || !target.currentContentVersionId)
      throw new NotFoundException({
        code: 'CONTENT_UNPUBLISHED',
        message: 'Practice target unavailable',
      });
    if (body.requestedMode !== 'LESSON')
      return this.startSpeed(
        target,
        body.requestedMode as 'SPEED_TIME' | 'SPEED_WORDS',
        userId,
      );
    const lesson = target?.lesson;
    if (
      !target ||
      target.kind !== 'LESSON' ||
      !lesson ||
      lesson.status !== 'PUBLISHED' ||
      !lesson.isActive ||
      lesson.course.status !== 'PUBLISHED' ||
      !target.currentContentVersionId
    )
      throw new NotFoundException({
        code: 'CONTENT_UNPUBLISHED',
        message: 'Lesson unavailable',
      });
    const version = await this.prisma.contentVersion.findFirst({
      where: { id: target.currentContentVersionId, targetId: target.id },
    });
    if (
      !version ||
      !['TEXT', 'INTRO'].includes(version.contentKind) ||
      !version.contentText ||
      !version.publishedAt ||
      sha256(version.contentText) !== version.contentHash
    )
      throw error(422, 'POLICY_MISMATCH', 'Published content is invalid');
    const isIntro = lesson.lessonType === 'INTRO';
    if (isIntro !== (version.contentKind === 'INTRO'))
      throw error(422, 'POLICY_MISMATCH', 'Lesson content kind mismatch');
    const goalWpm = lesson.goalWpm?.toNumber();
    const minAccuracy = lesson.minAccuracy?.toNumber();
    const minPassWpm = lesson.minPassWpm?.toNumber();
    if (
      !isIntro &&
      (!goalWpm || minAccuracy === undefined || minPassWpm === undefined)
    )
      throw error(422, 'POLICY_MISMATCH', 'Lesson thresholds are missing');
    const pinned: Snapshot = isIntro
      ? {
          kind: 'INTRO',
          text: version.contentText,
          contentHash: version.contentHash,
          keyboardLayout: 'US_QWERTY',
        }
      : {
          kind: 'TEXT',
          text: version.contentText,
          contentHash: version.contentHash,
          goalWpm: goalWpm!,
          minAccuracy: minAccuracy!,
          minPassWpm: minPassWpm!,
          keyboardLayout: 'US_QWERTY',
        };
    const now = new Date();
    const attempt = await this.prisma.practiceAttempt.create({
      data: {
        userId,
        targetId: target.id,
        contentVersionId: version.id,
        mode: 'LESSON',
        configSnapshot: pinned,
        scoringVersion: isIntro ? 'intro-v1' : 'lesson-v1',
        typingCoreVersion: TYPING_CORE_VERSION,
        status: 'READY',
        startedAt: now,
        expiresAt: new Date(now.getTime() + ATTEMPT_TTL_MS),
      },
    });
    return {
      attemptId: attempt.id,
      targetId: target.id,
      mode: 'LESSON',
      status: attempt.status,
      contentVersionId: version.id,
      contentHash: `sha256:${version.contentHash}`,
      content: { kind: pinned.kind, text: version.contentText },
      configSnapshot: {
        keyboardLayout: 'US_QWERTY',
        policy: isIntro ? {} : { goalWpm, minAccuracy, minPassWpm },
      },
      scoringVersion: attempt.scoringVersion,
      typingCoreVersion: attempt.typingCoreVersion,
      expiresAt: attempt.expiresAt.toISOString(),
    };
  }

  private async startSpeed(
    target: NonNullable<
      Awaited<ReturnType<PrismaService['practiceTarget']['findUnique']>>
    >,
    requestedMode: 'SPEED_TIME' | 'SPEED_WORDS',
    userId: string,
  ) {
    if (target.kind !== 'SPEED_TEST' || !target.speedConfigId)
      throw new NotFoundException({
        code: 'CONTENT_UNPUBLISHED',
        message: 'Speed configuration unavailable',
      });
    const config = await this.prisma.speedTestConfig.findUnique({
      where: { id: target.speedConfigId! },
    });
    if (
      target.kind !== 'SPEED_TEST' ||
      !config ||
      config.status !== 'PUBLISHED' ||
      !approvedSpeedConfig(config) ||
      requestedMode !== (config.mode === 'TIME' ? 'SPEED_TIME' : 'SPEED_WORDS')
    )
      throw new NotFoundException({
        code: 'CONTENT_UNPUBLISHED',
        message: 'Speed configuration unavailable',
      });
    const version = await this.prisma.contentVersion.findFirst({
      where: { id: target.currentContentVersionId!, targetId: target.id },
    });
    if (
      !version ||
      version.contentKind !== 'SPEED_CONFIG' ||
      !version.contentText ||
      !version.publishedAt ||
      sha256(version.contentText) !== version.contentHash ||
      config.generatorVersion !== SPEED_GENERATOR_VERSION
    )
      throw error(422, 'POLICY_MISMATCH', 'Speed content version is invalid');
    const versionConfig = version.configJson;
    if (
      !object(versionConfig) ||
      versionConfig.mode !== config.mode ||
      versionConfig.preset !==
        (config.mode === 'TIME' ? config.timeLimitSec : config.wordTarget) ||
      versionConfig.punctuationEnabled !== config.punctuationEnabled ||
      versionConfig.numbersEnabled !== config.numbersEnabled ||
      versionConfig.wordPoolVersion !== config.wordPoolVersion ||
      versionConfig.generatorVersion !== config.generatorVersion
    )
      throw error(422, 'POLICY_MISMATCH', 'Speed config version mismatch');
    const words = version.contentText.split(' ');
    const preset =
      config.mode === 'TIME' ? config.timeLimitSec! : config.wordTarget!;
    const seed = randomInt(0, 0x100000000);
    let text: string;
    try {
      text = generateSpeedText(
        words,
        seed,
        config.mode === 'TIME' ? 1200 : preset,
        config.punctuationEnabled,
        config.numbersEnabled,
      );
    } catch {
      throw error(422, 'POLICY_MISMATCH', 'Invalid speed word pool');
    }
    const pinned: SpeedSnapshot = {
      kind: 'SPEED',
      text,
      contentHash: sha256(text),
      keyboardLayout: 'US_QWERTY',
      mode: requestedMode,
      preset,
      seed,
      wordPoolVersion: config.wordPoolVersion,
      generatorVersion: config.generatorVersion,
      punctuationEnabled: config.punctuationEnabled,
      numbersEnabled: config.numbersEnabled,
    };
    const now = new Date();
    const attempt = await this.prisma.practiceAttempt.create({
      data: {
        userId,
        targetId: target.id,
        contentVersionId: version.id,
        mode: requestedMode,
        configSnapshot: pinned,
        scoringVersion: 'speed-v1',
        typingCoreVersion: TYPING_CORE_VERSION,
        status: 'READY',
        startedAt: now,
        expiresAt: new Date(now.getTime() + ATTEMPT_TTL_MS),
      },
    });
    return {
      attemptId: attempt.id,
      targetId: target.id,
      mode: requestedMode,
      status: attempt.status,
      contentVersionId: version.id,
      contentHash: `sha256:${pinned.contentHash}`,
      content: { kind: 'TEXT', text },
      configSnapshot: {
        keyboardLayout: 'US_QWERTY',
        preset,
        seed,
        wordPoolVersion: config.wordPoolVersion,
        generatorVersion: config.generatorVersion,
        punctuationEnabled: config.punctuationEnabled,
        numbersEnabled: config.numbersEnabled,
      },
      scoringVersion: attempt.scoringVersion,
      typingCoreVersion: attempt.typingCoreVersion,
      expiresAt: attempt.expiresAt.toISOString(),
    };
  }

  async finish(
    attemptId: string,
    key: string | undefined,
    body: unknown,
    principal: AuthPrincipal,
  ) {
    requireUuid(attemptId);
    const idempotencyKey = keyOf(key);
    const checked = finishProof(body);
    return this.finalize(
      attemptId,
      idempotencyKey,
      checked,
      principal,
      'FINISH',
    );
  }

  async abandon(
    attemptId: string,
    key: string | undefined,
    body: unknown,
    principal: AuthPrincipal,
  ) {
    requireUuid(attemptId);
    const idempotencyKey = keyOf(key);
    const checked =
      body === undefined || (object(body) && Object.keys(body).length === 0)
        ? null
        : proof(body);
    return this.finalize(
      attemptId,
      idempotencyKey,
      checked,
      principal,
      'ABANDON',
    );
  }

  private async finalize(
    attemptId: string,
    idempotencyKey: string,
    body: Proof | IntroProof | null,
    principal: AuthPrincipal,
    operation: 'FINISH' | 'ABANDON',
  ): Promise<unknown> {
    const requestHash = sha256(stable(body));
    for (let retry = 0; retry < 3; retry++) {
      try {
        return await this.prisma.$transaction(
          async (tx) => {
            await tx.$queryRaw`SELECT id FROM practice_attempts WHERE id = ${attemptId}::uuid FOR UPDATE`;
            const attempt = await tx.practiceAttempt.findUnique({
              where: { id: attemptId },
              include: { target: true, result: true, partialSnapshot: true },
            });
            if (!attempt)
              throw new NotFoundException({
                code: 'NOT_FOUND',
                message: 'Attempt not found',
              });
            if (attempt.userId !== principal.userId)
              throw error(403, 'OWNERSHIP_REQUIRED', 'Access denied');
            if (attempt.expiresAt <= new Date())
              throw error(410, 'ATTEMPT_EXPIRED', 'Attempt expired');
            const previous = await tx.attemptFinalizationRequest.findUnique({
              where: {
                attemptId_operation_idempotencyKey: {
                  attemptId,
                  operation,
                  idempotencyKey,
                },
              },
            });
            if (previous) {
              if (previous.requestHash !== requestHash)
                throw new ConflictException({
                  code: 'IDEMPOTENCY_CONFLICT',
                  message: 'Key already used with another payload',
                });
              return previous.responseJson;
            }
            if (!['READY', 'RUNNING', 'PAUSED'].includes(attempt.status))
              throw new ConflictException({
                code: 'ATTEMPT_ALREADY_FINALIZED',
                message: 'Attempt already finalized',
              });
            const pinned = snapshot(attempt.configSnapshot);
            if (
              sha256(pinned.text) !== pinned.contentHash ||
              attempt.typingCoreVersion !== TYPING_CORE_VERSION
            )
              throw error(
                422,
                'POLICY_MISMATCH',
                'Attempt snapshot version mismatch',
              );
            let replay = null;
            if (body && body.eventLogVersion === 1) {
              try {
                replay = replayEvents(pinned.text, body.events);
              } catch (cause) {
                if (cause instanceof InvalidEvent)
                  throw error(400, 'INVALID_EVENT_LOG', cause.message);
                throw cause;
              }
              if (
                replay.lastActiveTimeMs >
                Date.now() - attempt.createdAt.getTime() + 2000
              )
                throw error(
                  400,
                  'INVALID_EVENT_LOG',
                  'Event time exceeds attempt lifetime',
                );
            }
            let data: Record<string, unknown>;
            if (operation === 'ABANDON') {
              const partial = replay ? metrics(replay) : null;
              await tx.practiceAttempt.update({
                where: { id: attemptId },
                data: { status: 'ABANDONED', endedAt: new Date() },
              });
              if (replay)
                await tx.practicePartialSnapshot.create({
                  data: {
                    attemptId,
                    cursorPosition: replay.cursor,
                    activeTimeMs: BigInt(replay.lastActiveTimeMs),
                    partialMetricJson: {
                      effectiveWpm: partial!.effectiveWpm,
                      firstTryAccuracy: partial!.firstTryAccuracy,
                    },
                  },
                });
              data = {
                attemptId,
                status: 'ABANDONED',
                result: null,
                partial: partial
                  ? {
                      cursorPosition: replay!.cursor,
                      durationMs: partial.durationMs,
                    }
                  : null,
              };
            } else if (pinned.kind === 'INTRO') {
              if (
                !body ||
                body.eventLogVersion !== 2 ||
                attempt.scoringVersion !== 'intro-v1'
              )
                throw error(
                  400,
                  'INVALID_EVENT_LOG',
                  'INTRO requires acknowledgment proof',
                );
              const now = new Date();
              await tx.practiceAttempt.update({
                where: { id: attemptId },
                data: { status: 'COMPLETED', endedAt: now },
              });
              await tx.practiceResult.create({
                data: {
                  attemptId,
                  score: 0,
                  stars: 1,
                  passed: true,
                  verified: true,
                  eligibleForRanking: false,
                  metricJson: {},
                  scoringVersion: 'intro-v1',
                },
              });
              const lessonId = attempt.target.lessonId;
              if (!lessonId)
                throw error(422, 'POLICY_MISMATCH', 'Lesson target missing');
              await this.progress.recordLesson(
                tx,
                principal.userId,
                lessonId,
                attemptId,
                0,
                1,
                0,
                true,
                now,
              );
              data = {
                attemptId,
                status: 'COMPLETED',
                result: {
                  verified: true,
                  eligibleForRanking: false,
                  effectiveWpm: null,
                  firstTryAccuracy: null,
                  score: 0,
                  stars: 1,
                  passed: true,
                  durationMs: null,
                  scoringVersion: 'intro-v1',
                },
              };
            } else {
              if (!body || body.eventLogVersion !== 1)
                throw error(400, 'INVALID_EVENT_LOG', 'Typing proof required');
              if (!replay || replay.paused)
                throw error(
                  422,
                  'INVALID_SCORING_INPUT',
                  'Attempt did not finish',
                );
              const calculated = metrics(replay);
              const isSpeed = pinned.kind === 'SPEED';
              if (isSpeed) {
                if (
                  attempt.scoringVersion !== 'speed-v1' ||
                  attempt.mode !== pinned.mode
                )
                  throw error(422, 'POLICY_MISMATCH', 'Speed mode mismatch');
                if (pinned.mode === 'SPEED_TIME') {
                  if (
                    !replay.timedOut ||
                    calculated.durationMs < pinned.preset * 1000 ||
                    calculated.durationMs > pinned.preset * 1000 + 2000 ||
                    !replay.cursor
                  )
                    throw error(
                      422,
                      'INVALID_SCORING_INPUT',
                      'TIME preset not completed',
                    );
                } else if (!calculated.completed || replay.timedOut)
                  throw error(
                    422,
                    'INVALID_SCORING_INPUT',
                    'WORDS preset not completed',
                  );
              } else if (!calculated.completed || replay.timedOut) {
                throw error(
                  422,
                  'INVALID_SCORING_INPUT',
                  'Text is incomplete or incorrect',
                );
              }
              const lessonScore = isSpeed
                ? { score: null, stars: null, passed: null }
                : scoreLesson(calculated, pinned, attempt.scoringVersion);
              const eligible =
                calculated.durationMs > 0 && !calculated.hadPause;
              const comparisonGroup = isSpeed
                ? [
                    pinned.mode,
                    pinned.preset,
                    Number(pinned.punctuationEnabled),
                    Number(pinned.numbersEnabled),
                    pinned.wordPoolVersion,
                  ].join(':')
                : null;
              const now = new Date();
              await tx.practiceAttempt.update({
                where: { id: attemptId },
                data: { status: 'COMPLETED', endedAt: now },
              });
              await tx.practiceResult.create({
                data: {
                  attemptId,
                  effectiveWpm: calculated.effectiveWpm,
                  firstTryAccuracy: calculated.firstTryAccuracy,
                  accuracyFinal: calculated.accuracyFinal,
                  grossWpm: calculated.grossWpm,
                  durationMs: BigInt(calculated.durationMs),
                  scoredCorrectCount: calculated.scoredCorrectCount,
                  score: lessonScore.score,
                  stars: lessonScore.stars,
                  passed: lessonScore.passed,
                  verified: true,
                  eligibleForRanking: eligible,
                  metricJson: {
                    hadPause: calculated.hadPause,
                    ...(comparisonGroup ? { comparisonGroup } : {}),
                  },
                  scoringVersion: attempt.scoringVersion,
                },
              });
              if (!isSpeed) {
                const lessonId = attempt.target.lessonId;
                if (!lessonId)
                  throw error(422, 'POLICY_MISMATCH', 'Lesson target missing');
                await this.progress.recordLesson(
                  tx,
                  principal.userId,
                  lessonId,
                  attemptId,
                  lessonScore.score!,
                  lessonScore.stars!,
                  calculated.effectiveWpm,
                  lessonScore.passed!,
                  now,
                );
              }
              const keyStats = new Map<
                string,
                { attempts: number; correctFirstTry: number; mistakes: number }
              >();
              replay.firstTry.forEach((first, index) => {
                if (first === null) return;
                const label = pinned.text[index];
                const count = keyStats.get(label) || {
                  attempts: 0,
                  correctFirstTry: 0,
                  mistakes: 0,
                };
                count.attempts++;
                count.correctFirstTry += Number(first);
                count.mistakes += Number(!first);
                keyStats.set(label, count);
              });
              for (const [keyLabel, count] of keyStats)
                await tx.practiceKeyStat.create({
                  data: { attemptId, keyLabel, ...count },
                });
              data = {
                attemptId,
                status: 'COMPLETED',
                result: {
                  verified: true,
                  eligibleForRanking: eligible,
                  effectiveWpm: calculated.effectiveWpm,
                  firstTryAccuracy: calculated.firstTryAccuracy,
                  accuracyFinal: calculated.accuracyFinal,
                  score: lessonScore.score,
                  stars: lessonScore.stars,
                  passed: lessonScore.passed,
                  durationMs: calculated.durationMs,
                  scoringVersion: attempt.scoringVersion,
                  ...(comparisonGroup ? { comparisonGroup } : {}),
                },
              };
            }
            await tx.attemptFinalizationRequest.create({
              data: {
                attemptId,
                operation,
                idempotencyKey,
                requestHash,
                responseJson: data as Prisma.InputJsonValue,
                httpStatus: 200,
              },
            });
            return data;
          },
          { isolationLevel: 'Serializable' },
        );
      } catch (cause) {
        if (retryableTransactionError(cause) && retry < 2) continue;
        throw cause;
      }
    }
    throw error(
      HttpStatus.CONFLICT,
      'ATTEMPT_ALREADY_FINALIZED',
      'Could not finalize attempt',
    );
  }

  async attempt(attemptId: string, principal: AuthPrincipal) {
    requireUuid(attemptId);
    const attempt = await this.prisma.practiceAttempt.findUnique({
      where: { id: attemptId },
      include: { result: true, partialSnapshot: true },
    });
    if (!attempt)
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Attempt not found',
      });
    if (attempt.userId !== principal.userId && principal.role !== 'ADMIN')
      throw error(403, 'OWNERSHIP_REQUIRED', 'Access denied');
    const expired =
      ['READY', 'RUNNING', 'PAUSED'].includes(attempt.status) &&
      attempt.expiresAt <= new Date();
    return {
      attemptId: attempt.id,
      targetId: attempt.targetId,
      mode: attempt.mode,
      status: expired ? 'EXPIRED' : attempt.status,
      contentVersionId: attempt.contentVersionId,
      expiresAt: attempt.expiresAt.toISOString(),
      result: attempt.result
        ? {
            verified: attempt.result.verified,
            eligibleForRanking: attempt.result.eligibleForRanking,
            effectiveWpm: attempt.result.effectiveWpm?.toNumber() ?? null,
            firstTryAccuracy:
              attempt.result.firstTryAccuracy?.toNumber() ?? null,
            score: attempt.result.score,
            stars: attempt.result.stars,
            passed: attempt.result.passed,
            durationMs: Number(attempt.result.durationMs ?? 0),
            scoringVersion: attempt.result.scoringVersion,
          }
        : null,
      partial:
        attempt.partialSnapshot &&
        attempt.partialSnapshot.capturedAt.getTime() >
          Date.now() - 30 * 24 * 60 * 60_000
          ? {
              cursorPosition: attempt.partialSnapshot.cursorPosition,
              activeTimeMs: Number(attempt.partialSnapshot.activeTimeMs),
            }
          : null,
    };
  }
}
