import { createHash } from 'node:crypto';
import { PrismaClient } from '../generated/prisma/client';

// Original KeyCat keyboard drills, released under CC0-1.0 by product approval D-04.
type LessonSeed = { slug: string; title: string; text: string };
type SectionSeed = { title: string; lessons: LessonSeed[] };

const sections: SectionSeed[] = [
  {
    title: 'Home Row',
    lessons: [
      {
        slug: 'home-row-1',
        title: 'Home Row 1',
        text: 'asdf jkl; asdf jkl; fdsa ;lkj fdsa ;lkj',
      },
      {
        slug: 'home-row-2',
        title: 'Home Row 2',
        text: 'a s d f j k l ; a s d f j k l ; fj dk sl a;',
      },
    ],
  },
  {
    title: 'Top Row',
    lessons: [
      {
        slug: 'top-row-1',
        title: 'Top Row 1',
        text: 'qwer uiop qwer uiop rewq poi u rewq poi u',
      },
      {
        slug: 'top-row-2',
        title: 'Top Row 2',
        text: 'q w e r u i o p qwe rui opq wer uio p',
      },
    ],
  },
  {
    title: 'Bottom Row',
    lessons: [
      {
        slug: 'bottom-row-1',
        title: 'Bottom Row 1',
        text: 'zxcv m,./ zxcv m,./ vcxz /.,m vcxz /.,m',
      },
      {
        slug: 'bottom-row-2',
        title: 'Bottom Row 2',
        text: 'z x c v m , . / zx cv m, ./ xz cv m. /',
      },
    ],
  },
];

export function validateSeed(): void {
  const allLessons = sections.flatMap((section) => section.lessons);
  if (sections.length !== 3 || allLessons.length !== 6)
    throw new Error('Seed must contain exactly six lessons');
  if (
    new Set(allLessons.map((lesson) => lesson.slug)).size !== allLessons.length
  )
    throw new Error('Duplicate seed lesson slug');
  for (const lesson of allLessons) {
    if (
      lesson.text.length < 20 ||
      lesson.text.length > 240 ||
      !/^[\x20-\x7e]+$/.test(lesson.text)
    ) {
      throw new Error(`Invalid seed content for ${lesson.slug}`);
    }
  }
}

export async function seedLessons(prisma: PrismaClient): Promise<void> {
  validateSeed();
  await prisma.$transaction(async (tx) => {
    const course = await tx.course.upsert({
      where: { slug: 'keycat-rows-v1' },
      create: {
        slug: 'keycat-rows-v1',
        title: 'US QWERTY Foundations',
        locale: 'en',
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
      update: {},
    });
    let ordinal = 0;
    for (const [sectionIndex, sectionInput] of sections.entries()) {
      const section = await tx.section.upsert({
        where: {
          courseId_orderIndex: {
            courseId: course.id,
            orderIndex: sectionIndex + 1,
          },
        },
        create: {
          courseId: course.id,
          orderIndex: sectionIndex + 1,
          title: sectionInput.title,
        },
        update: {},
      });
      for (const lessonInput of sectionInput.lessons) {
        ordinal += 1;
        const lesson = await tx.lesson.upsert({
          where: {
            courseId_slug: { courseId: course.id, slug: lessonInput.slug },
          },
          create: {
            courseId: course.id,
            sectionId: section.id,
            courseOrdinal: ordinal,
            slug: lessonInput.slug,
            title: lessonInput.title,
            lessonType: 'KEY_DRILL',
            goalWpm: 20,
            minAccuracy: 90,
            minPassWpm: 16,
            status: 'PUBLISHED',
            isActive: true,
            policyJson: {},
          },
          update: {},
        });
        const target = await tx.practiceTarget.upsert({
          where: { lessonId: lesson.id },
          create: { kind: 'LESSON', lessonId: lesson.id },
          update: {},
        });
        const hash = createHash('sha256')
          .update(lessonInput.text)
          .digest('hex');
        const version = await tx.contentVersion.upsert({
          where: { targetId_versionNo: { targetId: target.id, versionNo: 1 } },
          create: {
            targetId: target.id,
            versionNo: 1,
            contentKind: 'TEXT',
            contentText: lessonInput.text,
            configJson: { layout: 'US_QWERTY', scoringVersion: 'lesson-v1' },
            contentHash: hash,
            sourceName: 'KeyCat Original',
            license: 'CC0-1.0',
            attribution: 'KeyCat',
            publishedAt: new Date(),
          },
          update: {},
        });
        if (
          version.contentHash !== hash ||
          version.contentText !== lessonInput.text
        )
          throw new Error(`Seed version conflict for ${lessonInput.slug}`);
        if (!target.currentContentVersionId) {
          await tx.practiceTarget.update({
            where: { id: target.id },
            data: { currentContentVersionId: version.id },
          });
        }
      }
    }
  });
}
