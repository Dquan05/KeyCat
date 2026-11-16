import { config } from 'dotenv';
import { resolve } from 'node:path';

config({
  path: resolve(
    __dirname,
    '../../../..',
    process.env.KEYCAT_ENV_FILE || '.env',
  ),
  quiet: true,
});

export type AppConfig = {
  databaseUrl: string;
  port: number;
};

export function readConfig(): AppConfig {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required');

  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL URL');
  }
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    throw new Error('DATABASE_URL must use PostgreSQL');
  }

  const port = Number(process.env.API_PORT ?? '3100');
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('API_PORT must be an integer from 1 to 65535');
  }

  return { databaseUrl, port };
}
