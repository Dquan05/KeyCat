import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';
import { resolve } from 'node:path';

config({
  path: resolve(__dirname, '../..', process.env.KEYCAT_ENV_FILE || '.env'),
  quiet: true,
});

export default defineConfig({
  schema: 'prisma/schema.prisma',
  ...(process.env.DATABASE_URL
    ? { datasource: { url: process.env.DATABASE_URL } }
    : {}),
});
