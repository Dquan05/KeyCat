const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const path = require('node:path');
const test = require('node:test');
const argon2 = require('argon2');
require('dotenv').config({
  path: path.resolve(
    __dirname,
    '../../..',
    process.env.KEYCAT_ENV_FILE || '.env.local',
  ),
  quiet: true,
});
const { PrismaService } = require('../dist/persistence/prisma.service.js');
const { AuthService } = require('../dist/auth/auth.service.js');
const { AuthController } = require('../dist/auth/auth.controller.js');

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
  'AUTH-01..04 register, verify, rotate, reset, guards and safe mail failure',
  { skip: !isolated && 'Set TEST_DATABASE_URL to an isolated local DB' },
  async () => {
    process.env.DATABASE_URL = testUrl;
    const prisma = new PrismaService();
    const sent = { verify: [], reset: [], failReset: false, failVerify: false };
    const mail = {
      async sendVerification(email, token) {
        if (sent.failVerify) throw new Error('SMTP unavailable');
        sent.verify.push({ email, token });
      },
      async sendReset(email, token) {
        if (sent.failReset) throw new Error('SMTP unavailable');
        sent.reset.push({ email, token });
      },
    };
    const auth = new AuthService(prisma, mail);
    const marker = randomUUID().slice(0, 8);
    const email = `auth-${marker}@example.test`;
    const username = `auth_${marker}`;
    const firstPassword = 'correct horse battery staple';
    const secondPassword = 'second correct horse battery';
    const thirdPassword = 'third correct horse battery';
    let userId;
    try {
      const registered = await auth.register(
        { email: email.toUpperCase(), username, password: firstPassword },
        marker,
      );
      userId = registered.id;
      assert.equal(registered.email, email);
      assert.equal(registered.verificationRequired, true);
      assert.equal(sent.verify.length, 1);
      const stored = await prisma.user.findUniqueOrThrow({
        where: { id: userId },
      });
      assert.notEqual(stored.passwordHash, firstPassword);
      assert.equal(
        await argon2.verify(stored.passwordHash, firstPassword),
        true,
      );
      await assert.rejects(
        auth.register(
          { email, username: `other_${marker}`, password: firstPassword },
          `${marker}-other`,
        ),
        (error) => error.getStatus() === 409,
      );
      assert.throws(
        () => auth.requireStart(null),
        (error) => error.getStatus() === 401,
      );
      assert.throws(
        () =>
          auth.requireStart({ userId, role: 'MEMBER', emailVerified: false }),
        (error) => error.getStatus() === 403,
      );
      await assert.rejects(
        auth.verifyEmail('0'.repeat(64)),
        (error) => error.getStatus() === 400,
      );
      sent.failVerify = true;
      assert.deepEqual(await auth.resendVerification(email, marker), {
        accepted: true,
      });
      assert.deepEqual(
        await auth.resendVerification(`missing-${email}`, marker),
        { accepted: true },
      );
      sent.failVerify = false;
      await auth.verifyEmail(sent.verify[0].token);
      await assert.rejects(
        auth.verifyEmail(sent.verify[0].token),
        (error) => error.getStatus() === 400,
      );
      await assert.rejects(
        auth.login({ email, password: 'wrong password' }, marker),
        (error) => error.getStatus() === 401,
      );

      const login = await auth.login(
        { email, password: firstPassword },
        marker,
      );
      assert.equal(login.user.emailVerified, true);
      const principal = await auth.authenticate(`Bearer ${login.accessToken}`);
      auth.requireStart(principal);
      assert.throws(
        () => auth.requireAdmin(principal),
        (error) => error.getStatus() === 403,
      );
      assert.throws(
        () => auth.requireOwner(principal, randomUUID()),
        (error) => error.getStatus() === 403,
      );
      auth.requireOwner(principal, userId);
      const rotated = await auth.refresh(login.refreshToken);
      assert.notEqual(rotated.refreshToken, login.refreshToken);
      await assert.rejects(
        auth.refresh(login.refreshToken),
        (error) => error.getStatus() === 401,
      );
      await assert.rejects(
        auth.refresh(rotated.refreshToken),
        (error) => error.getStatus() === 401,
      );

      const fresh = await auth.login(
        { email, password: firstPassword },
        `${marker}-fresh`,
      );
      const controller = new AuthController(auth);
      const captured = [];
      const response = {
        cookie(name, value, options) {
          captured.push({ name, value, options });
        },
        clearCookie() {},
      };
      const request = {
        ip: marker,
        headers: { origin: process.env.WEB_ORIGIN },
        requestId: marker,
        cookies: { 'keycat-refresh': fresh.refreshToken },
      };
      const refreshed = await controller.refresh(request, response);
      assert.ok(refreshed.data.accessToken);
      assert.equal(captured[0].name, 'keycat-refresh');
      assert.equal(captured[0].options.httpOnly, true);
      assert.equal(captured[0].options.sameSite, 'lax');
      await assert.rejects(
        controller.refresh(
          { ...request, headers: { origin: 'https://evil.example' } },
          response,
        ),
        (error) => error.getStatus() === 403,
      );
      await auth.logout(captured[0].value);
      await assert.rejects(
        auth.refresh(captured[0].value),
        (error) => error.getStatus() === 401,
      );

      await auth.forgotPassword(email, marker);
      assert.equal(sent.reset.length, 1);
      await auth.resetPassword({
        token: sent.reset[0].token,
        newPassword: secondPassword,
      });
      await assert.rejects(
        auth.resetPassword({
          token: sent.reset[0].token,
          newPassword: thirdPassword,
        }),
        (error) => error.getStatus() === 400,
      );
      await assert.rejects(
        auth.login({ email, password: firstPassword }, `${marker}-old`),
        (error) => error.getStatus() === 401,
      );
      await auth.login({ email, password: secondPassword }, `${marker}-new`);
      await assert.rejects(
        auth.changePassword(userId, {
          currentPassword: 'wrong',
          newPassword: thirdPassword,
        }),
        (error) => error.getStatus() === 401,
      );
      await auth.changePassword(userId, {
        currentPassword: secondPassword,
        newPassword: thirdPassword,
      });
      await assert.rejects(
        auth.login({ email, password: secondPassword }, `${marker}-second`),
        (error) => error.getStatus() === 401,
      );
      await auth.login({ email, password: thirdPassword }, `${marker}-third`);

      sent.failReset = true;
      assert.deepEqual(
        await auth.forgotPassword(email, `${marker}-mail-fail`),
        { accepted: true },
      );
      assert.deepEqual(
        await auth.forgotPassword(`missing-${marker}@example.test`, marker),
        { accepted: true },
      );
      await prisma.user.update({
        where: { id: userId },
        data: { status: 'SUSPENDED' },
      });
      await assert.rejects(
        auth.login({ email, password: thirdPassword }, `${marker}-suspended`),
        (error) => error.getStatus() === 423,
      );
    } finally {
      if (userId) {
        const sessions = await prisma.refreshSession.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        });
        for (const session of sessions)
          await prisma.refreshSession.delete({ where: { id: session.id } });
        await prisma.verificationToken.deleteMany({ where: { userId } });
        await prisma.user.delete({ where: { id: userId } });
      }
      await prisma.$disconnect();
    }
  },
);

test(
  'login rate limit blocks the eleventh attempt',
  { skip: !isolated && 'Set TEST_DATABASE_URL to an isolated local DB' },
  async () => {
    process.env.DATABASE_URL = testUrl;
    const prisma = new PrismaService();
    const auth = new AuthService(prisma, {
      sendVerification: async () => {},
      sendReset: async () => {},
    });
    const marker = randomUUID();
    try {
      for (let attempt = 0; attempt < 10; attempt++) {
        await assert.rejects(
          auth.login(
            { email: `${marker}@example.test`, password: 'invalid' },
            marker,
          ),
          (error) => error.getStatus() === 401,
        );
      }
      await assert.rejects(
        auth.login(
          { email: `${marker}@example.test`, password: 'invalid' },
          marker,
        ),
        (error) => error.getStatus() === 429,
      );
    } finally {
      await prisma.$disconnect();
    }
  },
);
