const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const test = require('node:test');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('../dist/generated/prisma/client.js');

const testUrl = process.env.TEST_DATABASE_URL;
const isolated = (() => {
  if (!testUrl) return false;
  const parsed = new URL(testUrl);
  return (
    ['localhost', '127.0.0.1'].includes(parsed.hostname) &&
    /(?:_db01_|_test|_ci)/.test(parsed.pathname)
  );
})();

test(
  'DB-02 owner, version and concurrent result constraints',
  { skip: !isolated && 'Set TEST_DATABASE_URL to an isolated local DB' },
  async () => {
    const prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: testUrl }),
    });
    const marker = randomUUID().slice(0, 8);
    let user;
    let course;
    let section;
    let firstLesson;
    let secondLesson;
    let firstTarget;
    let secondTarget;
    let firstVersion;
    let secondVersion;
    let attempt;
    try {
      user = await prisma.user.create({
        data: {
          email: `db02-${marker}@example.test`,
          username: `db02_${marker}`,
          passwordHash: 'test-hash-only',
        },
      });
      course = await prisma.course.create({
        data: { slug: `db02-${marker}`, title: 'DB02 Course', locale: 'vi' },
      });
      section = await prisma.section.create({
        data: { courseId: course.id, title: 'Section', orderIndex: 1 },
      });
      firstLesson = await prisma.lesson.create({
        data: {
          courseId: course.id,
          sectionId: section.id,
          courseOrdinal: 1,
          slug: 'first',
          title: 'First',
          lessonType: 'KEY_DRILL',
        },
      });
      secondLesson = await prisma.lesson.create({
        data: {
          courseId: course.id,
          sectionId: section.id,
          courseOrdinal: 2,
          slug: 'second',
          title: 'Second',
          lessonType: 'KEY_DRILL',
        },
      });

      await assert.rejects(
        prisma.practiceTarget.create({ data: { kind: 'LESSON' } }),
      );
      await assert.rejects(
        prisma.practiceTarget.create({
          data: { kind: 'SPEED_TEST', lessonId: firstLesson.id },
        }),
      );
      firstTarget = await prisma.practiceTarget.create({
        data: { kind: 'LESSON', lessonId: firstLesson.id },
      });
      secondTarget = await prisma.practiceTarget.create({
        data: { kind: 'LESSON', lessonId: secondLesson.id },
      });
      firstVersion = await prisma.contentVersion.create({
        data: {
          targetId: firstTarget.id,
          versionNo: 1,
          contentKind: 'TEXT',
          contentText: 'asdf asdf',
          configJson: {},
          contentHash: 'a'.repeat(64),
        },
      });
      secondVersion = await prisma.contentVersion.create({
        data: {
          targetId: secondTarget.id,
          versionNo: 1,
          contentKind: 'TEXT',
          contentText: 'jkl; jkl;',
          configJson: {},
          contentHash: 'b'.repeat(64),
        },
      });

      await assert.rejects(
        prisma.practiceTarget.update({
          where: { id: firstTarget.id },
          data: { currentContentVersionId: secondVersion.id },
        }),
      );
      await prisma.practiceTarget.update({
        where: { id: firstTarget.id },
        data: { currentContentVersionId: firstVersion.id },
      });
      const attemptData = {
        userId: user.id,
        targetId: firstTarget.id,
        mode: 'LESSON',
        status: 'READY',
        configSnapshot: {},
        scoringVersion: 'lesson-v1',
        typingCoreVersion: 'test',
        expiresAt: new Date(Date.now() + 30 * 60_000),
      };
      await assert.rejects(
        prisma.practiceAttempt.create({
          data: { ...attemptData, contentVersionId: secondVersion.id },
        }),
      );
      attempt = await prisma.practiceAttempt.create({
        data: { ...attemptData, contentVersionId: firstVersion.id },
      });

      await assert.rejects(
        prisma.practiceResult.create({
          data: {
            attemptId: attempt.id,
            score: 151,
            stars: 5,
            verified: true,
            eligibleForRanking: true,
            scoringVersion: 'lesson-v1',
          },
        }),
      );
      const resultData = {
        attemptId: attempt.id,
        score: 50,
        stars: 2,
        verified: true,
        eligibleForRanking: true,
        scoringVersion: 'lesson-v1',
      };
      const concurrent = await Promise.allSettled([
        prisma.practiceResult.create({ data: resultData }),
        prisma.practiceResult.create({ data: resultData }),
      ]);
      assert.equal(
        concurrent.filter((item) => item.status === 'fulfilled').length,
        1,
      );
      assert.equal(
        concurrent.filter((item) => item.status === 'rejected').length,
        1,
      );
      assert.equal(
        await prisma.practiceResult.count({ where: { attemptId: attempt.id } }),
        1,
      );
    } finally {
      if (attempt) {
        await prisma.practiceResult.deleteMany({
          where: { attemptId: attempt.id },
        });
        await prisma.practiceAttempt.delete({ where: { id: attempt.id } });
      }
      if (firstTarget)
        await prisma.practiceTarget.update({
          where: { id: firstTarget.id },
          data: { currentContentVersionId: null },
        });
      if (firstVersion)
        await prisma.contentVersion.delete({ where: { id: firstVersion.id } });
      if (secondVersion)
        await prisma.contentVersion.delete({ where: { id: secondVersion.id } });
      if (firstTarget)
        await prisma.practiceTarget.delete({ where: { id: firstTarget.id } });
      if (secondTarget)
        await prisma.practiceTarget.delete({ where: { id: secondTarget.id } });
      if (firstLesson)
        await prisma.lesson.delete({ where: { id: firstLesson.id } });
      if (secondLesson)
        await prisma.lesson.delete({ where: { id: secondLesson.id } });
      if (section) await prisma.section.delete({ where: { id: section.id } });
      if (course) await prisma.course.delete({ where: { id: course.id } });
      if (user) await prisma.user.delete({ where: { id: user.id } });
      await prisma.$disconnect();
    }
  },
);
