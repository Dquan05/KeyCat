import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import test from 'node:test';
import { MemoryRouter } from 'react-router';
import { createServer } from 'vite';

test('public, member and admin routes render the intended shells', async () => {
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
  });
  try {
    const { AppRoutes } = await vite.ssrLoadModule('/src/App.tsx');
    for (const [path, session, heading] of [
      ['/', null, 'Gõ vững từ những phím đầu tiên.'],
      ['/login', null, 'Đăng nhập'],
      ['/dashboard', { role: 'MEMBER' }, 'Bảng điều khiển'],
      ['/lessons', { role: 'MEMBER' }, 'Bài học'],
      ['/admin', { role: 'ADMIN' }, 'Quản trị'],
    ]) {
      const html = renderToString(
        createElement(
          MemoryRouter,
          { initialEntries: [path] },
          createElement(AppRoutes, { session }),
        ),
      );
      assert.ok(html.includes(heading), `${path} did not render ${heading}`);
    }
  } finally {
    await vite.close();
  }
});
