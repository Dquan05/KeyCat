const assert = require('node:assert/strict');
const test = require('node:test');
const {
  initialState,
  replayEvents,
  metrics,
  scoreLesson,
  normalizeKey,
  generateSpeedText,
  InvalidEvent,
} = require('../dist/index.js');

const insert = (seq, char, activeTimeMs) => ({
  seq,
  kind: 'INSERT',
  char,
  activeTimeMs,
});
const backspace = (seq, activeTimeMs) => ({
  seq,
  kind: 'BACKSPACE',
  activeTimeMs,
});

test('first attempt survives correction and repeated typing cannot farm score', () => {
  const events = [insert(1, 'x', 1000), backspace(2, 1200)];
  for (let round = 0; round < 50; round++) {
    events.push(insert(events.length + 1, 'a', 1300 + round * 100));
    if (round < 49)
      events.push(backspace(events.length + 1, 1350 + round * 100));
  }
  const state = replayEvents('a', events);
  const result = metrics(state);
  assert.equal(state.firstTry[0], false);
  assert.equal(result.scoredCorrectCount, 1);
  assert.equal(result.firstTryAccuracy, 0);
  assert.equal(result.completed, true);
  assert.equal(
    scoreLesson(
      result,
      { goalWpm: 20, minAccuracy: 90, minPassWpm: 16 },
      'lesson-v1',
    ).passed,
    false,
  );
});

test('event time, sequence and terminal state are validated', () => {
  assert.throws(() => replayEvents('ab', [insert(2, 'a', 1)]), InvalidEvent);
  assert.throws(
    () => replayEvents('ab', [insert(1, 'a', 10), insert(2, 'b', 9)]),
    InvalidEvent,
  );
  assert.throws(
    () =>
      replayEvents('ab', [
        { seq: 1, kind: 'TIMEOUT', activeTimeMs: 1 },
        insert(2, 'a', 2),
      ]),
    InvalidEvent,
  );
  assert.equal(metrics(initialState('a')).effectiveWpm, 0);
});

test('Tab is intercepted only within a focused practice target that expects it', () => {
  assert.equal(normalizeKey('Tab', false, '\t', true), null);
  assert.equal(normalizeKey('Tab', true, 'a', true), null);
  assert.equal(normalizeKey('Tab', true, '\t', false), null);
  assert.deepEqual(normalizeKey('Tab', true, '\t', true), {
    kind: 'INSERT',
    char: '\t',
    preventDefault: true,
  });
  assert.equal(normalizeKey('Shift', true, 'A', false), null);
  assert.equal(
    normalizeKey('A', true, 'A', false, {
      shift: false,
      capsLock: true,
      requireShift: true,
    }),
    null,
  );
  assert.deepEqual(
    normalizeKey('A', true, 'A', false, {
      shift: true,
      capsLock: false,
      requireShift: true,
    }),
    { kind: 'INSERT', char: 'A', preventDefault: true },
  );
});

test('active time is frozen during a pause', () => {
  assert.throws(
    () =>
      replayEvents('a', [
        { seq: 1, kind: 'PAUSE', activeTimeMs: 100 },
        { seq: 2, kind: 'RESUME', activeTimeMs: 101 },
      ]),
    InvalidEvent,
  );
});

test('lesson-v1 score, stars and pass follow the approved thresholds', () => {
  const state = replayEvents('aaaaa', [
    insert(1, 'a', 0),
    insert(2, 'a', 1000),
    insert(3, 'a', 2000),
    insert(4, 'a', 3000),
    insert(5, 'a', 4000),
  ]);
  const result = metrics(state);
  assert.equal(result.effectiveWpm, 15);
  assert.equal(result.firstTryAccuracy, 100);
  assert.deepEqual(
    scoreLesson(
      result,
      { goalWpm: 20, minAccuracy: 90, minPassWpm: 16 },
      'lesson-v1',
    ),
    { score: 75, stars: 3, passed: false },
  );
});

test('speed generator is deterministic and follows flags', () => {
  const pool = [
    'one',
    'two',
    'three',
    'four',
    'five',
    'six',
    'seven',
    'eight',
    'nine',
    'ten',
  ];
  const a = generateSpeedText(pool, 123, 25, true, true);
  assert.equal(a, generateSpeedText(pool, 123, 25, true, true));
  assert.equal(a.split(' ').length, 25);
  assert.notEqual(a, generateSpeedText(pool, 124, 25, true, true));
  assert.match(a, /\d/);
  assert.match(a, /[,.;]/);
  assert.doesNotMatch(
    generateSpeedText(pool, 123, 25, false, false),
    /[\d,.;]/,
  );
});

test('corrected positions never inflate final count across generated edit traces', () => {
  for (let seed = 1; seed <= 100; seed++) {
    const text = Array.from({ length: 10 }, (_, index) =>
      String.fromCharCode(97 + ((seed + index * 7) % 26)),
    ).join('');
    const events = [];
    let firstMistakes = 0;
    let time = 0;
    const add = (kind, char) => {
      time += 50;
      events.push({
        seq: events.length + 1,
        kind,
        ...(char ? { char } : {}),
        activeTimeMs: time,
      });
    };
    for (let index = 0; index < text.length; index++) {
      if ((seed + index) % 3 === 0) {
        firstMistakes++;
        add('INSERT', text[index] === 'z' ? 'a' : 'z');
        add('BACKSPACE');
      }
      add('INSERT', text[index]);
    }
    const result = metrics(replayEvents(text, events));
    assert.equal(result.scoredCorrectCount, text.length);
    assert.equal(result.firstTryAccuracy, 100 - firstMistakes * 10);
    assert.ok(result.effectiveWpm >= 0);
  }
});
