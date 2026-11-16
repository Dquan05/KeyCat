const assert = require('node:assert/strict');
const test = require('node:test');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('../dist/generated/prisma/client.js');
const { seedLessons, validateSeed } = require('../dist/seed/lesson-seed.js');

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
  'DB-03 seed is valid, idempotent and publishes the last lesson without prerequisites',
  { skip: !isolated && 'Set TEST_DATABASE_URL to an isolated local DB' },
  async () => {
    validateSeed();
    const prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: testUrl }),
    });
    try {
      await seedLessons(prisma);
      const course = await prisma.course.findUniqueOrThrow({
        where: { slug: 'keycat-rows-v1' },
      });
      const firstCount = await prisma.lesson.count({
        where: { courseId: course.id },
      });
      await seedLessons(prisma);
      const secondCount = await prisma.lesson.count({
        where: { courseId: course.id },
      });
      assert.equal(firstCount, 6);
      assert.equal(secondCount, 6);
      assert.equal(course.status, 'PUBLISHED');
      const lastLesson = await prisma.lesson.findFirstOrThrow({
        where: { courseId: course.id },
        orderBy: { courseOrdinal: 'desc' },
      });
      assert.equal(lastLesson.courseOrdinal, 6);
      assert.equal(lastLesson.status, 'PUBLISHED');
      assert.equal(lastLesson.isActive, true);
      const target = await prisma.practiceTarget.findUniqueOrThrow({
        where: { lessonId: lastLesson.id },
      });
      const version = await prisma.contentVersion.findUniqueOrThrow({
        where: { id: target.currentContentVersionId },
      });
      assert.equal(version.targetId, target.id);
      assert.equal(version.license, 'CC0-1.0');
      assert.equal(version.sourceName, 'KeyCat Original');
      assert.ok(version.contentText.length >= 20);
    } finally {
      await prisma.$disconnect();
    }
  },
);
