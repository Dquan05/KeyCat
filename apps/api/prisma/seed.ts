import { config } from 'dotenv';
import { resolve } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { seedLessons } from '../src/seed/lesson-seed';
import { seedSpeedConfigs } from '../src/seed/speed-seed';

config({
  path: resolve(
    __dirname,
    '../../..',
    process.env.KEYCAT_ENV_FILE || '.env.local',
  ),
  quiet: true,
});

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required for seed');
  const parsed = new URL(databaseUrl);
  if (!['localhost', '127.0.0.1'].includes(parsed.hostname))
    throw new Error('Seed is restricted to local PostgreSQL');
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  });
  try {
    await seedLessons(prisma);
    await seedSpeedConfigs(prisma);
    process.stdout.write('KeyCat lesson and speed config seed complete\n');
  } finally {
    await prisma.$disconnect();
  }
}

void main();
