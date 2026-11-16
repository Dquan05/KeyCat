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
  'DB-01 unique and section ownership constraints',
  { skip: !isolated && 'Set TEST_DATABASE_URL to an isolated local DB' },
  async () => {
    const prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: testUrl }),
    });
    const marker = randomUUID().slice(0, 8);
    let user;
    let firstCourse;
    let secondCourse;
    let section;
    try {
      user = await prisma.user.create({
        data: {
          email: `db01-${marker}@example.test`,
          username: `db01_${marker}`,
          passwordHash: 'test-hash-only',
        },
      });
      await assert.rejects(
        prisma.user.create({
          data: {
            email: user.email,
            username: `other_${marker}`,
            passwordHash: 'test-hash-only',
          },
        }),
        { code: 'P2002' },
      );
      await assert.rejects(
        prisma.user.create({
          data: {
            email: `other-${marker}@example.test`,
            username: user.username,
            passwordHash: 'test-hash-only',
          },
        }),
        { code: 'P2002' },
      );
      await assert.rejects(
        prisma.user.create({
          data: {
            email: `DB01-${marker}@EXAMPLE.TEST`,
            username: `upper_${marker}`,
            passwordHash: 'test-hash-only',
          },
        }),
      );

      firstCourse = await prisma.course.create({
        data: { slug: `db01-a-${marker}`, title: 'Course A', locale: 'vi' },
      });
      secondCourse = await prisma.course.create({
        data: { slug: `db01-b-${marker}`, title: 'Course B', locale: 'vi' },
      });
      section = await prisma.section.create({
        data: { courseId: firstCourse.id, title: 'Section A', orderIndex: 1 },
      });
      await assert.rejects(
        prisma.lesson.create({
          data: {
            courseId: secondCourse.id,
            sectionId: section.id,
            courseOrdinal: 1,
            slug: 'wrong-course',
            title: 'Wrong course',
            lessonType: 'KEY_DRILL',
          },
        }),
        { code: 'P2003' },
      );
      const lesson = await prisma.lesson.create({
        data: {
          courseId: firstCourse.id,
          sectionId: section.id,
          courseOrdinal: 1,
          slug: 'correct-course',
          title: 'Correct course',
          lessonType: 'KEY_DRILL',
        },
      });
      assert.equal(lesson.courseId, section.courseId);
    } finally {
      if (firstCourse)
        await prisma.lesson.deleteMany({ where: { courseId: firstCourse.id } });
      if (section) await prisma.section.delete({ where: { id: section.id } });
      if (firstCourse)
        await prisma.course.delete({ where: { id: firstCourse.id } });
      if (secondCourse)
        await prisma.course.delete({ where: { id: secondCourse.id } });
      if (user) await prisma.user.delete({ where: { id: user.id } });
      await prisma.$disconnect();
    }
  },
);
