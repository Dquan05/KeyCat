const assert = require('node:assert/strict');
const { Buffer } = require('node:buffer');
const { spawn } = require('node:child_process');
const { createHash, randomUUID } = require('node:crypto');
const net = require('node:net');
const path = require('node:path');
const test = require('node:test');
const argon2 = require('argon2');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('../dist/generated/prisma/client.js');
const { seedLessons } = require('../dist/seed/lesson-seed.js');
const { seedSpeedConfigs } = require('../dist/seed/speed-seed.js');
const { PracticeService } = require('../dist/practice/practice.service.js');
const { ProgressService } = require('../dist/progress/progress.service.js');

const testUrl = process.env.TEST_DATABASE_URL;
const isolated = (() => {
  if (!testUrl) return false;
  const url = new URL(testUrl);
  return (
    ['localhost', '127.0.0.1'].includes(url.hostname) &&
    /(?:_test|_ci)/.test(url.pathname)
  );
})();

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
}

test(
  'CORE catalog, practice, speed and owner HTTP flow',
  { skip: !isolated && 'Set TEST_DATABASE_URL to an isolated local DB' },
  async () => {
    const prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: testUrl }),
    });
    const marker = randomUUID().slice(0, 8);
    const password = 'verified account test password';
    let child;
    let previousVersion;
    let changedTarget;
    try {
      await seedLessons(prisma);
      await seedSpeedConfigs(prisma);
      const fixtureCourse = await prisma.course.create({
        data: {
          slug: `core-fixture-${marker}`,
          title: 'CORE fixture',
          locale: 'en',
          status: 'PUBLISHED',
        },
      });
      const fixtureSection = await prisma.section.create({
        data: {
          courseId: fixtureCourse.id,
          orderIndex: 1,
          title: 'Fixture section',
        },
      });
      const createFixtureLesson = async (
        slug,
        status,
        lessonType,
        text,
        ordinal,
      ) => {
        const lesson = await prisma.lesson.create({
          data: {
            courseId: fixtureCourse.id,
            sectionId: fixtureSection.id,
            courseOrdinal: ordinal,
            slug,
            title: slug,
            lessonType,
            status,
            isActive: true,
            ...(lessonType === 'INTRO'
              ? {}
              : { goalWpm: 20, minAccuracy: 90, minPassWpm: 16 }),
          },
        });
        const target = await prisma.practiceTarget.create({
          data: {
            kind: 'LESSON',
            lessonId: lesson.id,
          },
        });
        const version = await prisma.contentVersion.create({
          data: {
            targetId: target.id,
            versionNo: 1,
            contentKind: lessonType === 'INTRO' ? 'INTRO' : 'TEXT',
            contentText: text,
            contentHash: createHash('sha256').update(text).digest('hex'),
            configJson: {},
            publishedAt: new Date(),
          },
        });
        await prisma.practiceTarget.update({
          where: { id: target.id },
          data: { currentContentVersionId: version.id },
        });
        return { lesson, target, version };
      };
      const mainFixture = await createFixtureLesson(
        `typing-${marker}`,
        'PUBLISHED',
        'KEY_DRILL',
        'asdf jkl; asdf jkl; fdsa ;lkj fdsa ;lkj',
        1,
      );
      const draftFixture = await createFixtureLesson(
        `draft-${marker}`,
        'DRAFT',
        'KEY_DRILL',
        'this draft lesson is not available to members',
        2,
      );
      const user = await prisma.user.create({
        data: {
          email: `core-${marker}@example.test`,
          username: `core_${marker}`,
          passwordHash: await argon2.hash(password),
          emailVerifiedAt: new Date(),
        },
      });
      const other = await prisma.user.create({
        data: {
          email: `other-${marker}@example.test`,
          username: `other_${marker}`,
          passwordHash: await argon2.hash(password),
          emailVerifiedAt: new Date(),
        },
      });
      const unverified = await prisma.user.create({
        data: {
          email: `unverified-${marker}@example.test`,
          username: `unverified_${marker}`,
          passwordHash: await argon2.hash(password),
        },
      });
      const port = await freePort();
      child = spawn(process.execPath, ['dist/main.js'], {
        cwd: path.resolve(__dirname, '..'),
        env: { ...process.env, DATABASE_URL: testUrl, API_PORT: String(port) },
        stdio: 'ignore',
      });
      const base = `http://127.0.0.1:${port}/v1`;
      for (let tries = 0; tries < 100; tries++) {
        try {
          if ((await fetch(`${base}/health`)).ok) break;
        } catch {
          /* starting */
        }
        if (tries === 99) throw new Error('API did not start');
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      const login = async (account) => {
        const response = await fetch(`${base}/auth/login`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email: account.email, password }),
        });
        assert.equal(response.status, 200);
        return (await response.json()).data.accessToken;
      };
      const token = await login(user);
      const otherToken = await login(other);
      const unverifiedToken = await login(unverified);
      const call = async (route, auth = token, method = 'GET', body, key) => {
        const response = await fetch(`${base}${route}`, {
          method,
          headers: {
            authorization: `Bearer ${auth}`,
            ...(body ? { 'content-type': 'application/json' } : {}),
            ...(key ? { 'idempotency-key': key } : {}),
          },
          ...(body ? { body: JSON.stringify(body) } : {}),
        });
        return { status: response.status, body: await response.json() };
      };
      const courses = await call('/courses');
      assert.equal(courses.status, 200);
      assert.ok(courses.body.data.items.length);
      assert.equal((await call('/lessons?bogus=1')).status, 400);
      assert.equal((await call('/lessons?cursor=bad')).status, 400);
      const listed = await call('/lessons?limit=2');
      assert.equal(listed.status, 200);
      assert.equal(listed.body.data.items.length, 2);
      const next = await call(
        `/lessons?limit=2&cursor=${encodeURIComponent(listed.body.meta.nextCursor)}`,
      );
      assert.equal(next.status, 200);
      assert.notEqual(next.body.data.items[0].id, listed.body.data.items[0].id);
      const seedCourse = courses.body.data.items.find(
        (item) => item.slug === 'keycat-rows-v1',
      );
      const sections = await call(`/courses/${seedCourse.id}/sections`);
      assert.equal(sections.status, 200);
      assert.deepEqual(
        sections.body.data.items.map((item) => item.orderIndex),
        [1, 2, 3],
      );
      const all = await call(`/lessons?courseId=${seedCourse.id}`);
      const last = all.body.data.items.find((item) => item.courseOrdinal === 6);
      assert.ok(last, 'Seed course must contain lesson 6');
      assert.equal(last.courseOrdinal, 6);
      assert.equal((await call(`/lessons/${last.id}`)).status, 200);
      assert.equal(
        (await call(`/lessons/${draftFixture.lesson.id}`)).status,
        404,
      );
      assert.equal(
        (
          await call('/practice/attempts', token, 'POST', {
            targetId: draftFixture.target.id,
            requestedMode: 'LESSON',
          })
        ).status,
        404,
      );
      assert.equal(
        (
          await call('/practice/attempts', token, 'POST', {
            targetId: last.practiceTargetId,
            requestedMode: 'LESSON',
          })
        ).status,
        201,
      );
      assert.equal(
        (
          await call('/practice/attempts', token, 'POST', {
            targetId: mainFixture.target.id,
            requestedMode: 'LESSON',
            deviceSupported: false,
          })
        ).status,
        403,
      );
      assert.equal(
        (
          await call('/practice/attempts', unverifiedToken, 'POST', {
            targetId: mainFixture.target.id,
            requestedMode: 'LESSON',
          })
        ).status,
        403,
      );
      const guestStart = await fetch(`${base}/practice/attempts`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          targetId: mainFixture.target.id,
          requestedMode: 'LESSON',
        }),
      });
      assert.equal(guestStart.status, 401);
      const start = await call('/practice/attempts', token, 'POST', {
        targetId: mainFixture.target.id,
        requestedMode: 'LESSON',
        deviceSupported: true,
      });
      assert.equal(start.status, 201);
      assert.equal(start.body.data.contentVersionId !== null, true);
      const { attemptId, content } = start.body.data;
      const target = await prisma.practiceTarget.findUnique({
        where: { id: mainFixture.target.id },
      });
      changedTarget = target.id;
      previousVersion = target.currentContentVersionId;
      const changedText =
        'another published version with different keyboard words';
      const v2 = await prisma.contentVersion.create({
        data: {
          targetId: target.id,
          versionNo: Math.floor(Date.now() / 1000),
          contentKind: 'TEXT',
          contentText: changedText,
          contentHash: createHash('sha256').update(changedText).digest('hex'),
          configJson: {},
          publishedAt: new Date(),
        },
      });
      await prisma.practiceTarget.update({
        where: { id: target.id },
        data: { currentContentVersionId: v2.id },
      });
      await prisma.practiceAttempt.update({
        where: { id: attemptId },
        data: { createdAt: new Date(Date.now() - 120_000) },
      });
      const events = [...content.text].map((char, index) => ({
        seq: index + 1,
        kind: 'INSERT',
        char,
        activeTimeMs: (index + 1) * 500,
      }));
      const finishBody = { eventLogVersion: 1, events, score: 999999 };
      const invalidAttempt = await call('/practice/attempts', token, 'POST', {
        targetId: mainFixture.target.id,
        requestedMode: 'LESSON',
      });
      assert.equal(
        (
          await call(
            `/practice/attempts/${invalidAttempt.body.data.attemptId}/finish`,
            token,
            'POST',
            {
              eventLogVersion: 1,
              events: [{ seq: 2, kind: 'INSERT', char: 'a', activeTimeMs: 1 }],
            },
            `invalid-${marker}`,
          )
        ).status,
        400,
      );
      const oversized = await call(
        `/practice/attempts/${invalidAttempt.body.data.attemptId}/finish`,
        token,
        'POST',
        { eventLogVersion: 1, events: [], filler: 'x'.repeat(270_000) },
        `oversized-${marker}`,
      );
      assert.equal(oversized.status, 413);
      assert.equal(oversized.body.error.code, 'PAYLOAD_TOO_LARGE');
      const finish = await call(
        `/practice/attempts/${attemptId}/finish`,
        token,
        'POST',
        finishBody,
        `finish-${marker}`,
      );
      assert.equal(finish.status, 200);
      assert.equal(finish.body.data.status, 'COMPLETED');
      assert.ok(finish.body.data.result.score < 999999);
      const repeat = await call(
        `/practice/attempts/${attemptId}/finish`,
        token,
        'POST',
        finishBody,
        `finish-${marker}`,
      );
      assert.deepEqual(repeat.body.data, finish.body.data);
      assert.equal(
        (
          await call(
            `/practice/attempts/${attemptId}/finish`,
            token,
            'POST',
            { eventLogVersion: 1, events: [] },
            `finish-${marker}`,
          )
        ).status,
        409,
      );
      assert.equal(
        (
          await call(
            `/practice/attempts/${attemptId}/finish`,
            token,
            'POST',
            finishBody,
            `finish-again-${marker}`,
          )
        ).status,
        409,
      );
      assert.equal(
        await prisma.practiceResult.count({ where: { attemptId } }),
        1,
      );
      const largeStart = await call('/practice/attempts', token, 'POST', {
        targetId: mainFixture.target.id,
        requestedMode: 'LESSON',
      });
      const largeId = largeStart.body.data.attemptId;
      await prisma.practiceAttempt.update({
        where: { id: largeId },
        data: { createdAt: new Date(Date.now() - 120_000) },
      });
      const largeText = largeStart.body.data.content.text;
      const largeEvents = [...largeText].map((char, index) => ({
        seq: index + 1,
        kind: 'INSERT',
        char,
        activeTimeMs: (index + 1) * 100,
      }));
      let lastTime = largeEvents.at(-1).activeTimeMs;
      for (let round = 0; round < 1100; round++) {
        lastTime += 10;
        largeEvents.push({
          seq: largeEvents.length + 1,
          kind: 'BACKSPACE',
          activeTimeMs: lastTime,
        });
        lastTime += 10;
        largeEvents.push({
          seq: largeEvents.length + 1,
          kind: 'INSERT',
          char: largeText.at(-1),
          activeTimeMs: lastTime,
        });
      }
      const largeProof = { eventLogVersion: 1, events: largeEvents };
      const largeBytes = Buffer.byteLength(JSON.stringify(largeProof));
      assert.ok(largeBytes > 100 * 1024 && largeBytes < 256 * 1024);
      assert.equal(
        (
          await call(
            `/practice/attempts/${largeId}/finish`,
            token,
            'POST',
            largeProof,
            `large-${marker}`,
          )
        ).status,
        200,
      );
      const concurrentStart = await call('/practice/attempts', token, 'POST', {
        targetId: mainFixture.target.id,
        requestedMode: 'LESSON',
      });
      const concurrentId = concurrentStart.body.data.attemptId;
      await prisma.practiceAttempt.update({
        where: { id: concurrentId },
        data: { createdAt: new Date(Date.now() - 120_000) },
      });
      const concurrentEvents = [...concurrentStart.body.data.content.text].map(
        (char, index) => ({
          seq: index + 1,
          kind: 'INSERT',
          char,
          activeTimeMs: (index + 1) * 400,
        }),
      );
      const concurrentBody = { eventLogVersion: 1, events: concurrentEvents };
      const simultaneous = await Promise.all([
        call(
          `/practice/attempts/${concurrentId}/finish`,
          token,
          'POST',
          concurrentBody,
          `concurrent-a-${marker}`,
        ),
        call(
          `/practice/attempts/${concurrentId}/finish`,
          token,
          'POST',
          concurrentBody,
          `concurrent-b-${marker}`,
        ),
      ]);
      assert.deepEqual(
        simultaneous.map((item) => item.status).sort(),
        [200, 409],
      );
      assert.equal(
        await prisma.practiceResult.count({
          where: { attemptId: concurrentId },
        }),
        1,
      );
      const progressBefore = await prisma.lessonProgress.findUniqueOrThrow({
        where: {
          userId_lessonId: { userId: user.id, lessonId: mainFixture.lesson.id },
        },
      });
      const slowerStart = await call('/practice/attempts', token, 'POST', {
        targetId: mainFixture.target.id,
        requestedMode: 'LESSON',
      });
      const slowerId = slowerStart.body.data.attemptId;
      await prisma.practiceAttempt.update({
        where: { id: slowerId },
        data: { createdAt: new Date(Date.now() - 300_000) },
      });
      const slowerEvents = [...slowerStart.body.data.content.text].map(
        (char, index) => ({
          seq: index + 1,
          kind: 'INSERT',
          char,
          activeTimeMs: (index + 1) * 5000,
        }),
      );
      assert.equal(
        (
          await call(
            `/practice/attempts/${slowerId}/finish`,
            token,
            'POST',
            { eventLogVersion: 1, events: slowerEvents },
            `slower-${marker}`,
          )
        ).status,
        200,
      );
      const progressAfter = await prisma.lessonProgress.findUniqueOrThrow({
        where: {
          userId_lessonId: { userId: user.id, lessonId: mainFixture.lesson.id },
        },
      });
      assert.equal(progressAfter.bestScore, progressBefore.bestScore);
      assert.equal(
        progressAfter.attemptsCount,
        progressBefore.attemptsCount + 1,
      );
      assert.equal(
        (await call(`/practice/attempts/${attemptId}`, otherToken)).status,
        403,
      );
      assert.deepEqual(
        (await call('/me/history', otherToken)).body.data.items,
        [],
      );
      const emptyStats = (await call('/me/stats', otherToken)).body.data;
      assert.deepEqual(emptyStats, {
        attemptsCompleted: 0,
        lessonsPracticed: 0,
        lessonsPassed: 0,
        totalActiveMs: 0,
        averageWpm: null,
        averageFirstTryAccuracy: null,
        chart: [],
        weakKeys: [],
        empty: true,
      });
      await prisma.practiceAttempt.update({
        where: { id: invalidAttempt.body.data.attemptId },
        data: {
          createdAt: new Date(Date.now() - 31 * 60_000),
          expiresAt: new Date(Date.now() - 1000),
        },
      });
      assert.equal(
        (await call(`/practice/attempts/${invalidAttempt.body.data.attemptId}`))
          .body.data.status,
        'EXPIRED',
      );
      assert.ok(
        (await call('/me/history?status=EXPIRED')).body.data.items.some(
          (item) => item.attemptId === invalidAttempt.body.data.attemptId,
        ),
      );
      assert.equal(
        (
          await call(
            `/practice/attempts/${invalidAttempt.body.data.attemptId}/finish`,
            token,
            'POST',
            finishBody,
            `expired-${marker}`,
          )
        ).status,
        410,
      );
      const history = await call('/me/history');
      assert.ok(
        history.body.data.items.some((item) => item.attemptId === attemptId),
      );
      assert.equal(
        (await call('/me/stats')).body.data.attemptsCompleted >= 1,
        true,
      );
      const abandoned = await call('/practice/attempts', token, 'POST', {
        targetId: mainFixture.target.id,
        requestedMode: 'LESSON',
      });
      const abandon = await call(
        `/practice/attempts/${abandoned.body.data.attemptId}/abandon`,
        token,
        'POST',
        {},
        `abandon-${marker}`,
      );
      assert.equal(abandon.body.data.status, 'ABANDONED');
      const abandonedRow = (
        await call('/me/history?status=ABANDONED')
      ).body.data.items.find(
        (item) => item.attemptId === abandoned.body.data.attemptId,
      );
      assert.equal(abandonedRow.result.score, 0);
      const partialStart = await call('/practice/attempts', token, 'POST', {
        targetId: mainFixture.target.id,
        requestedMode: 'LESSON',
      });
      const partialId = partialStart.body.data.attemptId;
      const partialProof = {
        eventLogVersion: 1,
        events: [
          {
            seq: 1,
            kind: 'INSERT',
            char: partialStart.body.data.content.text[0],
            activeTimeMs: 100,
          },
        ],
      };
      const partialAbandon = await call(
        `/practice/attempts/${partialId}/abandon`,
        token,
        'POST',
        partialProof,
        `partial-${marker}`,
      );
      assert.equal(partialAbandon.status, 200);
      assert.equal(
        (await call(`/practice/attempts/${partialId}`)).body.data.partial
          .cursorPosition,
        1,
      );
      await prisma.practicePartialSnapshot.update({
        where: { attemptId: partialId },
        data: { capturedAt: new Date(Date.now() - 31 * 24 * 60 * 60_000) },
      });
      const cleanup = new PracticeService(prisma, new ProgressService(prisma));
      assert.ok((await cleanup.prunePartialSnapshots()) >= 1);
      assert.equal(
        await prisma.practicePartialSnapshot.count({
          where: { attemptId: partialId },
        }),
        0,
      );
      const statsBeforeIntro = (await call('/me/stats')).body.data;
      const introText =
        'Read the home row keyboard guidance and acknowledge it.';
      const introFixture = await createFixtureLesson(
        `intro-${marker}`,
        'PUBLISHED',
        'INTRO',
        introText,
        3,
      );
      const introStart = await call('/practice/attempts', token, 'POST', {
        targetId: introFixture.target.id,
        requestedMode: 'LESSON',
      });
      assert.equal(introStart.status, 201);
      const introFinish = await call(
        `/practice/attempts/${introStart.body.data.attemptId}/finish`,
        token,
        'POST',
        { eventLogVersion: 2, acknowledged: true },
        `intro-${marker}`,
      );
      assert.equal(introFinish.status, 200);
      assert.equal(introFinish.body.data.result.effectiveWpm, null);
      assert.equal(introFinish.body.data.result.passed, true);
      assert.equal(
        (await call('/me/stats')).body.data.averageWpm,
        statsBeforeIntro.averageWpm,
      );
      const configs = await call('/speed-test/configs');
      assert.equal(configs.body.data.items.length, 20);
      for (const mode of ['SPEED_TIME', 'SPEED_WORDS']) {
        const config = configs.body.data.items.find(
          (item) =>
            item.mode === (mode === 'SPEED_TIME' ? 'TIME' : 'WORDS') &&
            !item.punctuationEnabled &&
            !item.numbersEnabled &&
            (mode === 'SPEED_TIME'
              ? item.timeLimitSec === 60
              : item.wordTarget === 25),
        );
        const started = await call('/practice/attempts', token, 'POST', {
          targetId: config.practiceTargetId,
          requestedMode: mode,
        });
        assert.equal(started.status, 201);
        const id = started.body.data.attemptId;
        await prisma.practiceAttempt.update({
          where: { id },
          data: { createdAt: new Date(Date.now() - 90_000) },
        });
        const text = started.body.data.content.text;
        const speedEvents =
          mode === 'SPEED_TIME'
            ? [
                { seq: 1, kind: 'INSERT', char: text[0], activeTimeMs: 1000 },
                { seq: 2, kind: 'TIMEOUT', activeTimeMs: 60_000 },
              ]
            : [...text].map((char, index) => ({
                seq: index + 1,
                kind: 'INSERT',
                char,
                activeTimeMs: (index + 1) * 300,
              }));
        const result = await call(
          `/practice/attempts/${id}/finish`,
          token,
          'POST',
          { eventLogVersion: 1, events: speedEvents },
          `speed-${mode}-${marker}`,
        );
        assert.equal(result.status, 200);
        assert.equal(result.body.data.result.score, null);
        assert.equal(result.body.data.result.eligibleForRanking, true);
        assert.match(
          result.body.data.result.comparisonGroup,
          new RegExp(`^${mode}:`),
        );
        if (mode === 'SPEED_WORDS') {
          const paused = await call('/practice/attempts', token, 'POST', {
            targetId: config.practiceTargetId,
            requestedMode: mode,
          });
          const pausedId = paused.body.data.attemptId;
          await prisma.practiceAttempt.update({
            where: { id: pausedId },
            data: { createdAt: new Date(Date.now() - 90_000) },
          });
          const pausedText = paused.body.data.content.text;
          const pausedEvents = [
            { seq: 1, kind: 'INSERT', char: pausedText[0], activeTimeMs: 300 },
            { seq: 2, kind: 'PAUSE', activeTimeMs: 300 },
            { seq: 3, kind: 'RESUME', activeTimeMs: 300 },
            ...[...pausedText.slice(1)].map((char, index) => ({
              seq: index + 4,
              kind: 'INSERT',
              char,
              activeTimeMs: (index + 2) * 300,
            })),
          ];
          const pausedResult = await call(
            `/practice/attempts/${pausedId}/finish`,
            token,
            'POST',
            { eventLogVersion: 1, events: pausedEvents },
            `pause-${marker}`,
          );
          assert.equal(pausedResult.status, 200);
          assert.equal(pausedResult.body.data.result.eligibleForRanking, false);
        }
      }
      const games = await call('/games');
      assert.deepEqual(games.body.data.items, [
        { key: 'SPEED_TEST', available: true },
      ]);
    } finally {
      if (changedTarget && previousVersion)
        await prisma.practiceTarget.update({
          where: { id: changedTarget },
          data: { currentContentVersionId: previousVersion },
        });
      if (child) child.kill();
      await prisma.$disconnect();
    }
  },
);
