import { test, expect, type Page } from '@playwright/test';

const user = {
  id: 'user-1',
  email: 'member@example.test',
  username: 'member',
  role: 'MEMBER',
  status: 'ACTIVE',
  emailVerified: true,
};
const settings = {
  uiLanguage: 'vi',
  theme: 'light',
  typingFont: 'monospace',
  fontSize: 24,
  showKeyboard: true,
  showHands: true,
  soundEnabled: false,
};
const targetId = '11111111-1111-4111-8111-111111111111';
const lessonId = '22222222-2222-4222-8222-222222222222';
let attemptNo = 0;
async function mockApi(
  page: Page,
  {
    empty = false,
    failStats = false,
    dropFinish = false,
    intro = false,
    onFinish,
    onStart,
  }: {
    empty?: boolean;
    failStats?: boolean;
    dropFinish?: boolean;
    intro?: boolean;
    onFinish?: (body: string | null, key: string | undefined) => void;
    onStart?: (body: { targetId: string; requestedMode: string }) => void;
  } = {},
) {
  let completed = false;
  let finishCalls = 0;
  const currentSettings = { ...settings };
  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace('/api/v1', '');
    const method = route.request().method();
    const respond = (data: unknown, status = 200, meta: object = {}) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify({ data, meta: { requestId: 'test', ...meta } }),
      });
    if (path === '/auth/refresh')
      return respond({ accessToken: 'access', user });
    if (path === '/me/settings' && method === 'GET')
      return respond(currentSettings);
    if (path === '/me/settings' && method === 'PATCH')
      return respond(
        Object.assign(currentSettings, route.request().postDataJSON()),
      );
    if (path === '/me') return respond(user);
    if (path === '/me/stats') {
      if (failStats) {
        failStats = false;
        return route.abort('failed');
      }
      return respond({
        empty,
        attemptsCompleted: empty ? 0 : 1,
        lessonsPracticed: empty ? 0 : 1,
        lessonsPassed: empty ? 0 : 1,
        totalActiveMs: empty ? 0 : 3000,
        averageWpm: empty ? null : 30,
        averageFirstTryAccuracy: empty ? null : 100,
        chart: empty
          ? []
          : [{ day: '2026-11-17', averageWpm: 30, attempts: 1 }],
        weakKeys: [],
      });
    }
    if (path === '/me/history')
      return respond({ items: [] }, 200, { nextCursor: null });
    if (path === '/lessons')
      return respond({
        items: [
          {
            id: lessonId,
            title: 'Home keys',
            lessonType: 'KEY_DRILL',
            courseOrdinal: 1,
            goalWpm: 20,
            minAccuracy: 90,
            practiceTargetId: targetId,
            best: null,
          },
        ],
      });
    if (path === `/lessons/${lessonId}`)
      return respond({
        id: lessonId,
        title: 'Home keys',
        lessonType: 'KEY_DRILL',
        courseOrdinal: 1,
        goalWpm: 20,
        minAccuracy: 90,
        practiceTargetId: targetId,
        available: true,
        best: null,
      });
    if (path === '/speed-test/configs')
      return respond({
        items: [
          {
            id: 'time',
            practiceTargetId: targetId,
            mode: 'TIME',
            timeLimitSec: 60,
            wordTarget: null,
            punctuationEnabled: false,
            numbersEnabled: false,
          },
          {
            id: 'words',
            practiceTargetId: targetId,
            mode: 'WORDS',
            timeLimitSec: null,
            wordTarget: 25,
            punctuationEnabled: false,
            numbersEnabled: false,
          },
          {
            id: 'punctuation',
            practiceTargetId: '33333333-3333-4333-8333-333333333333',
            mode: 'TIME',
            timeLimitSec: 60,
            wordTarget: null,
            punctuationEnabled: true,
            numbersEnabled: false,
          },
        ],
      });
    if (path === '/practice/attempts' && method === 'POST') {
      const body = route.request().postDataJSON();
      onStart?.(body);
      attemptNo++;
      return respond(
        {
          attemptId: `attempt-${attemptNo}`,
          targetId,
          mode: body.requestedMode,
          status: 'READY',
          content: {
            kind: intro ? 'INTRO' : 'TEXT',
            text: intro
              ? 'Use your home row keys.'
              : body.requestedMode === 'SPEED_TIME'
                ? 'a'.repeat(100)
                : 'as',
          },
          configSnapshot: {
            keyboardLayout: 'US_QWERTY',
            preset: body.requestedMode === 'SPEED_TIME' ? 60 : 25,
          },
          expiresAt: new Date(Date.now() + 1800000).toISOString(),
        },
        201,
      );
    }
    if (path.match(/^\/practice\/attempts\/[^/]+\/finish$/)) {
      finishCalls++;
      onFinish?.(
        route.request().postData(),
        route.request().headers()['idempotency-key'],
      );
      completed = true;
      if (dropFinish && finishCalls === 1) return route.abort('failed');
      return respond({
        attemptId: path.split('/')[3],
        status: 'COMPLETED',
        result: {
          verified: true,
          eligibleForRanking: !intro,
          effectiveWpm: intro ? null : 30,
          firstTryAccuracy: intro ? null : 100,
          score: intro ? 0 : 100,
          stars: intro ? 1 : 5,
          passed: true,
          durationMs: 3000,
        },
      });
    }
    if (path.match(/^\/practice\/attempts\/[^/]+$/))
      return respond({
        attemptId: path.split('/')[3],
        targetId,
        mode: 'LESSON',
        status: completed ? 'COMPLETED' : 'READY',
        result: completed
          ? {
              verified: true,
              eligibleForRanking: true,
              effectiveWpm: 30,
              firstTryAccuracy: 100,
              score: 100,
              stars: 5,
              passed: true,
              durationMs: 3000,
            }
          : null,
        expiresAt: new Date(Date.now() + 1800000).toISOString(),
      });
    return respond(null, 404);
  });
}

test('Lesson can start, type and show official result', async ({ page }) => {
  await mockApi(page);
  await page.goto('/lessons');
  await page.getByRole('link', { name: 'Xem bài học' }).click();
  await page.getByRole('button', { name: 'Bắt đầu luyện' }).click();
  const typing = page.getByRole('textbox', { name: 'Vùng luyện gõ' });
  await expect(typing).toBeVisible();
  await typing.focus();
  await page.keyboard.type('as');
  await expect(page.getByText('WPM chính thức')).toBeVisible();
  await expect(page.getByText('Đã xác minh')).toBeVisible();
});

test('Dashboard empty and network retry state', async ({ page }) => {
  await mockApi(page, { empty: true });
  await page.goto('/dashboard');
  await expect(
    page.getByText('Bạn chưa có kết quả luyện tập chính thức.'),
  ).toBeVisible();
});

test('Speed WORDS uses selected mode and reaches result', async ({ page }) => {
  await mockApi(page);
  await page.goto('/speed-test');
  await page.getByLabel('Theo số từ').check();
  await page.getByRole('button', { name: 'Bắt đầu Speed Test' }).click();
  const typing = page.getByRole('textbox', { name: 'Vùng luyện gõ' });
  await typing.focus();
  await page.keyboard.type('as');
  await expect(page.getByText('WPM chính thức')).toBeVisible();
});

test('Dashboard offers retry after a network error', async ({ page }) => {
  await mockApi(page, { failStats: true });
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Thử lại' }).click();
  await expect(page.getByText('Phiên hoàn thành')).toBeVisible();
});

test('lost Finish response retries identical payload and key', async ({
  page,
}) => {
  const sent: { body: string | null; key: string | undefined }[] = [];
  await mockApi(page, {
    dropFinish: true,
    onFinish: (body, key) => sent.push({ body, key }),
  });
  await page.goto(`/lessons/${lessonId}`);
  await page.getByRole('button', { name: 'Bắt đầu luyện' }).click();
  const typing = page.getByRole('textbox', { name: 'Vùng luyện gõ' });
  await typing.focus();
  await page.keyboard.type('as');
  await page.getByRole('button', { name: 'Gửi lại kết quả' }).click();
  await expect(page.getByText('WPM chính thức')).toBeVisible();
  expect(sent).toHaveLength(2);
  expect(sent[1]).toEqual(sent[0]);
});

test('Speed TIME ends at its preset', async ({ page }) => {
  await page.clock.install();
  await mockApi(page);
  await page.goto('/speed-test');
  await page.getByRole('button', { name: 'Bắt đầu Speed Test' }).click();
  const typing = page.getByRole('textbox', { name: 'Vùng luyện gõ' });
  await typing.focus();
  await page.keyboard.type('a');
  await page.clock.fastForward(60_100);
  await expect(page.getByText('WPM chính thức')).toBeVisible();
});

test('appearance persists after reload without changing pinned practice text', async ({
  page,
}) => {
  await mockApi(page);
  await page.goto(`/lessons/${lessonId}`);
  await page.getByRole('button', { name: 'Bắt đầu luyện' }).click();
  const typing = page.getByRole('textbox', { name: 'Vùng luyện gõ' });
  const text = await typing.innerText();
  await page.getByLabel('Interface language').selectOption('en');
  await expect(
    page.getByRole('heading', { name: 'Type the text' }),
  ).toBeVisible();
  expect(await typing.innerText()).toBe(text);
  await page.reload();
  await expect(page.getByLabel('Interface language')).toHaveValue('en');
  expect(
    await page.getByRole('textbox', { name: 'Vùng luyện gõ' }).innerText(),
  ).toBe(text);
});

test('Speed flags select matching published configuration', async ({
  page,
}) => {
  const starts: { targetId: string; requestedMode: string }[] = [];
  await mockApi(page, { onStart: (body) => starts.push(body) });
  await page.goto('/speed-test');
  await page.getByLabel('Dấu câu').check();
  await page.getByRole('button', { name: 'Bắt đầu Speed Test' }).click();
  expect(starts[0]).toMatchObject({
    targetId: '33333333-3333-4333-8333-333333333333',
    requestedMode: 'SPEED_TIME',
  });
});

test('reloading an active Lesson keeps typed progress', async ({ page }) => {
  await mockApi(page);
  await page.goto(`/lessons/${lessonId}`);
  await page.getByRole('button', { name: 'Bắt đầu luyện' }).click();
  const typing = page.getByRole('textbox', { name: 'Vùng luyện gõ' });
  await typing.focus();
  await page.keyboard.type('a');
  await page.reload();
  const resumed = page.getByRole('textbox', { name: 'Vùng luyện gõ' });
  await expect(resumed.locator('.correct-char')).toHaveText('a');
  await resumed.focus();
  await page.keyboard.type('s');
  await expect(page.getByText('WPM chính thức')).toBeVisible();
});

test('INTRO Lesson completes with acknowledgment', async ({ page }) => {
  await mockApi(page, { intro: true });
  await page.goto(`/lessons/${lessonId}`);
  await page.getByRole('button', { name: 'Bắt đầu luyện' }).click();
  await page.getByRole('button', { name: 'Tôi đã đọc xong' }).click();
  await expect(page.getByText('WPM chính thức')).toBeVisible();
});

test('unsupported viewport explains why Start is unavailable', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockApi(page);
  await page.goto(`/lessons/${lessonId}`);
  await expect(
    page.getByText('Cần máy tính có bàn phím vật lý để bắt đầu.'),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Bắt đầu luyện' }),
  ).toBeDisabled();
});

test('switching UI language keeps unsent form values', async ({ page }) => {
  await mockApi(page);
  await page.goto('/register');
  await page.getByLabel('Email').fill('new@example.test');
  await page.getByLabel('Tên đăng nhập').fill('newmember');
  await page.getByLabel('Interface language').selectOption('en');
  await expect(page.getByRole('heading', { name: 'Register' })).toBeVisible();
  await expect(page.getByLabel('Email')).toHaveValue('new@example.test');
  await expect(page.getByLabel('Username')).toHaveValue('newmember');
});
