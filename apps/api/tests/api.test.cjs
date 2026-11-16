const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const net = require('node:net');
const path = require('node:path');
const test = require('node:test');
require('dotenv').config({
  path: path.resolve(
    __dirname,
    '../../..',
    process.env.KEYCAT_ENV_FILE || '.env',
  ),
  quiet: true,
});
const { readConfig } = require('../dist/config/env.js');

test('config fails fast without database URL or with an invalid port', () => {
  const oldUrl = process.env.DATABASE_URL;
  const oldPort = process.env.API_PORT;
  try {
    process.env.DATABASE_URL = '';
    assert.throws(readConfig, /DATABASE_URL is required/);
    process.env.DATABASE_URL = 'not-a-postgres-url';
    assert.throws(readConfig, /valid PostgreSQL URL/);
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    process.env.API_PORT = 'invalid';
    assert.throws(readConfig, /API_PORT must be an integer/);
  } finally {
    if (oldUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = oldUrl;
    if (oldPort === undefined) delete process.env.API_PORT;
    else process.env.API_PORT = oldPort;
  }
});

async function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
}

test('health and bad route use the API envelopes', async () => {
  assert.ok(
    process.env.DATABASE_URL,
    'DATABASE_URL required for integration test',
  );
  const port = await freePort();
  const child = spawn(process.execPath, ['dist/main.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, API_PORT: String(port) },
    stdio: 'ignore',
  });
  const base = `http://127.0.0.1:${port}/v1`;
  try {
    let ready = false;
    for (let attempt = 0; attempt < 80; attempt++) {
      if (child.exitCode !== null) break;
      try {
        const response = await fetch(`${base}/health`);
        if (response.ok) {
          ready = true;
          break;
        }
      } catch {
        /* Server is still starting. */
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.ok(ready, 'API health did not become ready');

    const healthy = await fetch(`${base}/health`);
    assert.equal(healthy.status, 200);
    const health = await healthy.json();
    assert.deepEqual(health.data, { status: 'ok', database: 'connected' });
    assert.match(health.meta.requestId, /^[\da-f-]{36}$/i);
    assert.equal(healthy.headers.get('x-request-id'), health.meta.requestId);

    const missing = await fetch(`${base}/does-not-exist`);
    assert.equal(missing.status, 404);
    const error = await missing.json();
    assert.equal(error.error.code, 'NOT_FOUND');
    assert.match(error.error.requestId, /^[\da-f-]{36}$/i);
    assert.equal(missing.headers.get('x-request-id'), error.error.requestId);
    assert.ok(!JSON.stringify(error).includes(process.env.DATABASE_URL));
  } finally {
    child.kill();
  }
});

test('health reports a safe 503 envelope when PostgreSQL is unavailable', async () => {
  const port = await freePort();
  const child = spawn(process.execPath, ['dist/main.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: {
      ...process.env,
      API_PORT: String(port),
      DATABASE_URL: 'postgresql://test:test@127.0.0.1:1/test',
    },
    stdio: 'ignore',
  });
  try {
    let response;
    for (let attempt = 0; attempt < 80; attempt++) {
      if (child.exitCode !== null) break;
      try {
        response = await fetch(`http://127.0.0.1:${port}/v1/health`);
        break;
      } catch {
        /* Server is still starting. */
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.ok(response, 'API did not start');
    assert.equal(response.status, 503);
    const body = await response.json();
    assert.equal(body.error.code, 'SERVICE_UNAVAILABLE');
    assert.match(body.error.requestId, /^[\da-f-]{36}$/i);
    assert.ok(!JSON.stringify(body).includes('postgresql://'));
  } finally {
    child.kill();
  }
});
