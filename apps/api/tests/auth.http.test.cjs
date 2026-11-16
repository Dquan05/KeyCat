const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const net = require('node:net');
const path = require('node:path');
const test = require('node:test');
const argon2 = require('argon2');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('../dist/generated/prisma/client.js');
require('dotenv').config({
  path: path.resolve(
    __dirname,
    '../../..',
    process.env.KEYCAT_ENV_FILE || '.env.local',
  ),
  quiet: true,
});

const testUrl = process.env.TEST_DATABASE_URL;
const isolated = (() => {
  if (!testUrl) return false;
  const parsed = new URL(testUrl);
  return (
    ['localhost', '127.0.0.1'].includes(parsed.hostname) &&
    /(?:_db01_|_test|_ci)/.test(parsed.pathname)
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
  'HTTP auth cookie, refresh rotation, origin check and /me',
  { skip: !isolated && 'Set TEST_DATABASE_URL to an isolated local DB' },
  async () => {
    const prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: testUrl }),
    });
    const marker = randomUUID().slice(0, 8);
    const password = 'verified account test password';
    const user = await prisma.user.create({
      data: {
        email: `http-${marker}@example.test`,
        username: `http_${marker}`,
        passwordHash: await argon2.hash(password),
        emailVerifiedAt: new Date(),
      },
    });
    const port = await freePort();
    const child = spawn(process.execPath, ['dist/main.js'], {
      cwd: path.resolve(__dirname, '..'),
      env: { ...process.env, DATABASE_URL: testUrl, API_PORT: String(port) },
      stdio: 'ignore',
    });
    const base = `http://127.0.0.1:${port}/v1`;
    try {
      let ready = false;
      for (let attempt = 0; attempt < 80; attempt++) {
        if (child.exitCode !== null) break;
        try {
          if ((await fetch(`${base}/health`)).ok) {
            ready = true;
            break;
          }
        } catch {
          /* Still starting. */
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      assert.ok(ready, 'API did not start');
      const login = await fetch(`${base}/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: user.email, password }),
      });
      assert.equal(login.status, 200);
      const loginBody = await login.json();
      assert.equal(loginBody.data.user.id, user.id);
      assert.ok(loginBody.data.accessToken);
      const cookie = login.headers.get('set-cookie');
      assert.match(cookie, /HttpOnly/i);
      assert.match(cookie, /SameSite=Lax/i);
      const cookiePair = cookie.split(';')[0];

      const profile = await fetch(`${base}/me`, {
        headers: { authorization: `Bearer ${loginBody.data.accessToken}` },
      });
      assert.equal(profile.status, 200);
      assert.equal((await profile.json()).data.id, user.id);

      const authHeaders = {
        authorization: `Bearer ${loginBody.data.accessToken}`,
        'content-type': 'application/json',
      };
      const changedProfile = await fetch(`${base}/me`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({
          displayName: 'KeyCat member',
          timezone: 'Asia/Ho_Chi_Minh',
        }),
      });
      assert.equal(changedProfile.status, 200);
      assert.equal(
        (await changedProfile.json()).data.displayName,
        'KeyCat member',
      );
      const invalidZone = await fetch(`${base}/me`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ timezone: 'Invalid/Zone' }),
      });
      assert.equal(invalidZone.status, 400);
      const changedSettings = await fetch(`${base}/me/settings`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({
          uiLanguage: 'en',
          theme: 'dark',
          typingFont: 'monospace',
          fontSize: 28,
          showKeyboard: false,
        }),
      });
      assert.equal(changedSettings.status, 200);
      assert.equal((await changedSettings.json()).data.theme, 'dark');
      const invalidSettings = await fetch(`${base}/me/settings`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ fontSize: 100 }),
      });
      assert.equal(invalidSettings.status, 400);
      const nullSettings = await fetch(`${base}/me/settings`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ theme: null }),
      });
      assert.equal(nullSettings.status, 400);
      const settingsAfter = await fetch(`${base}/me/settings`, {
        headers: authHeaders,
      });
      assert.equal((await settingsAfter.json()).data.fontSize, 28);

      const loginAgain = await fetch(`${base}/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: user.email, password }),
      });
      assert.equal(loginAgain.status, 200);
      const loginAgainBody = await loginAgain.json();
      const settingsAfterLogin = await fetch(`${base}/me/settings`, {
        headers: { authorization: `Bearer ${loginAgainBody.data.accessToken}` },
      });
      const persisted = (await settingsAfterLogin.json()).data;
      assert.equal(persisted.theme, 'dark');
      assert.equal(persisted.fontSize, 28);
      assert.equal(persisted.uiLanguage, 'en');

      const badOrigin = await fetch(`${base}/auth/refresh`, {
        method: 'POST',
        headers: { origin: 'https://evil.example', cookie: cookiePair },
      });
      assert.equal(badOrigin.status, 403);
      assert.equal((await badOrigin.json()).error.code, 'CSRF_REJECTED');
      const refresh = await fetch(`${base}/auth/refresh`, {
        method: 'POST',
        headers: { origin: process.env.WEB_ORIGIN, cookie: cookiePair },
      });
      assert.equal(refresh.status, 200);
      const refreshedBody = await refresh.json();
      assert.notEqual(
        refresh.headers.get('set-cookie').split(';')[0],
        cookiePair,
      );
      const oldAccess = await fetch(`${base}/me`, {
        headers: { authorization: `Bearer ${loginBody.data.accessToken}` },
      });
      assert.equal(oldAccess.status, 401);
      const reuse = await fetch(`${base}/auth/refresh`, {
        method: 'POST',
        headers: { origin: process.env.WEB_ORIGIN, cookie: cookiePair },
      });
      assert.equal(reuse.status, 401);
      const newAccess = await fetch(`${base}/me`, {
        headers: { authorization: `Bearer ${refreshedBody.data.accessToken}` },
      });
      assert.equal(newAccess.status, 401);

      const invalid = await fetch(`${base}/auth/register`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'bad', username: 'bad', password }),
      });
      assert.equal(invalid.status, 400);
      assert.equal((await invalid.json()).error.code, 'VALIDATION_ERROR');
    } finally {
      child.kill();
      const sessions = await prisma.refreshSession.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      });
      for (const session of sessions)
        await prisma.refreshSession.delete({ where: { id: session.id } });
      await prisma.userSettings.deleteMany({ where: { userId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
      await prisma.$disconnect();
    }
  },
);
