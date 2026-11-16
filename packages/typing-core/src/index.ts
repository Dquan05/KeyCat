/** Deterministic, browser-independent typing rules shared by preview and replay. */
export const TYPING_CORE_VERSION = 'typing-v1';
export const MAX_EVENTS = 10_000;
export const MAX_PROOF_BYTES = 256 * 1024;

export type TypingEvent = {
  seq: number;
  kind: 'INSERT' | 'BACKSPACE' | 'PAUSE' | 'RESUME' | 'TIMEOUT';
  char?: string;
  activeTimeMs: number;
  shift?: boolean;
  capsLock?: boolean;
};

export type TypingState = {
  text: string;
  typed: string[];
  firstTry: (boolean | null)[];
  cursor: number;
  insertedCount: number;
  mistakes: number;
  paused: boolean;
  timedOut: boolean;
  hadPause: boolean;
  lastSeq: number;
  lastActiveTimeMs: number;
};

export class InvalidEvent extends Error {}

export function initialState(text: string): TypingState {
  return {
    text,
    typed: [],
    firstTry: Array.from(text, () => null),
    cursor: 0,
    insertedCount: 0,
    mistakes: 0,
    paused: false,
    timedOut: false,
    hadPause: false,
    lastSeq: 0,
    lastActiveTimeMs: 0,
  };
}

export function normalizeKey(
  key: string,
  focused: boolean,
  expected: string | undefined,
  allowTab: boolean,
  modifiers: {
    shift?: boolean;
    capsLock?: boolean;
    requireShift?: boolean;
  } = {},
): {
  kind: 'INSERT' | 'BACKSPACE';
  char?: string;
  preventDefault: boolean;
} | null {
  if (!focused) return null;
  if (key === 'Backspace') return { kind: 'BACKSPACE', preventDefault: true };
  if (key === 'Tab')
    return allowTab && expected === '\t'
      ? { kind: 'INSERT', char: '\t', preventDefault: true }
      : null;
  if (
    modifiers.requireShift &&
    expected &&
    /^[A-Z]$/.test(expected) &&
    (!modifiers.shift || modifiers.capsLock)
  )
    return null;
  if (key.length === 1 && /^[\x20-\x7e]$/.test(key))
    return { kind: 'INSERT', char: key, preventDefault: true };
  return null;
}

export function reduceEvent(
  state: TypingState,
  event: TypingEvent,
): TypingState {
  if (!Number.isInteger(event.seq) || event.seq !== state.lastSeq + 1)
    throw new InvalidEvent('Event sequence is not consecutive');
  if (
    !Number.isInteger(event.activeTimeMs) ||
    event.activeTimeMs < state.lastActiveTimeMs
  )
    throw new InvalidEvent('Event time moved backwards');
  if (state.paused && event.activeTimeMs !== state.lastActiveTimeMs)
    throw new InvalidEvent('Active time advanced while paused');
  if (state.timedOut) throw new InvalidEvent('Event after timeout');
  const next: TypingState = {
    ...state,
    typed: [...state.typed],
    firstTry: [...state.firstTry],
    lastSeq: event.seq,
    lastActiveTimeMs: event.activeTimeMs,
  };
  switch (event.kind) {
    case 'INSERT': {
      if (state.paused || state.cursor >= state.text.length)
        throw new InvalidEvent('Insert outside active text');
      if (
        typeof event.char !== 'string' ||
        event.char.length !== 1 ||
        !/^[\x20-\x7e\t]$/.test(event.char)
      )
        throw new InvalidEvent('Invalid character');
      const correct = event.char === state.text[state.cursor];
      if (next.firstTry[state.cursor] === null)
        next.firstTry[state.cursor] = correct;
      next.typed[state.cursor] = event.char;
      next.cursor++;
      next.insertedCount++;
      if (!correct) next.mistakes++;
      return next;
    }
    case 'BACKSPACE':
      if (state.paused || state.cursor === 0)
        throw new InvalidEvent('Invalid backspace');
      next.cursor--;
      next.typed.pop();
      return next;
    case 'PAUSE':
      if (state.paused) throw new InvalidEvent('Already paused');
      next.paused = true;
      next.hadPause = true;
      return next;
    case 'RESUME':
      if (!state.paused) throw new InvalidEvent('Not paused');
      next.paused = false;
      return next;
    case 'TIMEOUT':
      if (state.paused) throw new InvalidEvent('Timeout while paused');
      next.timedOut = true;
      return next;
    default:
      throw new InvalidEvent('Unknown event kind');
  }
}

export function replayEvents(text: string, events: TypingEvent[]): TypingState {
  let state = initialState(text);
  for (const event of events) state = reduceEvent(state, event);
  return state;
}

export type Metrics = {
  durationMs: number;
  grossWpm: number;
  effectiveWpm: number;
  firstTryAccuracy: number;
  accuracyFinal: number;
  scoredCorrectCount: number;
  completed: boolean;
  hadPause: boolean;
};

const round2 = (value: number) => Math.round(value * 100) / 100;
export function metrics(state: TypingState): Metrics {
  const correctFinal = state.typed.reduce(
    (count, char, index) => count + Number(char === state.text[index]),
    0,
  );
  const attempted = state.firstTry.filter((value) => value !== null);
  const firstCorrect = attempted.filter(Boolean).length;
  const minutes = state.lastActiveTimeMs / 60_000;
  return {
    durationMs: state.lastActiveTimeMs,
    grossWpm: minutes > 0 ? round2(state.insertedCount / (5 * minutes)) : 0,
    effectiveWpm: minutes > 0 ? round2(correctFinal / (5 * minutes)) : 0,
    firstTryAccuracy: attempted.length
      ? round2((100 * firstCorrect) / attempted.length)
      : 0,
    accuracyFinal: state.typed.length
      ? round2((100 * correctFinal) / state.typed.length)
      : 0,
    scoredCorrectCount: correctFinal,
    completed:
      state.cursor === state.text.length && correctFinal === state.text.length,
    hadPause: state.hadPause,
  };
}

export type LessonPolicy = {
  goalWpm: number;
  minAccuracy: number;
  minPassWpm: number;
};
export function scoreLesson(
  result: Metrics,
  policy: LessonPolicy,
  scoringVersion: string,
) {
  if (scoringVersion !== 'lesson-v1')
    throw new Error('Unsupported scoring version');
  if (
    ![policy.goalWpm, policy.minAccuracy, policy.minPassWpm].every(
      Number.isFinite,
    ) ||
    policy.goalWpm <= 0
  )
    throw new Error('Invalid lesson policy');
  if (!result.completed) return { score: 0, stars: 0, passed: false };
  const score = Math.round(
    100 *
      Math.min(result.effectiveWpm / policy.goalWpm, 1.5) *
      Math.min(result.firstTryAccuracy / 100, 1),
  );
  const stars =
    1 +
    Number(result.firstTryAccuracy >= 90) +
    Number(result.firstTryAccuracy >= 95) +
    Number(result.effectiveWpm >= 0.8 * policy.goalWpm) +
    Number(result.effectiveWpm >= policy.goalWpm);
  return {
    score,
    stars,
    passed:
      result.firstTryAccuracy >= policy.minAccuracy &&
      result.effectiveWpm >= policy.minPassWpm,
  };
}

export const SPEED_GENERATOR_VERSION = 'xorshift32-v1';
export function generateSpeedText(
  words: string[],
  seed: number,
  count: number,
  punctuation: boolean,
  numbers: boolean,
): string {
  if (
    !Number.isInteger(seed) ||
    seed < 0 ||
    seed > 0xffffffff ||
    !Number.isInteger(count) ||
    count < 1 ||
    count > 1200 ||
    words.length < 10 ||
    words.some((word) => !/^[a-z]+$/.test(word))
  )
    throw new Error('Invalid speed generator input');
  let state = seed || 0x9e3779b9;
  const next = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return state >>> 0;
  };
  const result: string[] = [];
  for (let index = 0; index < count; index++) {
    let word = words[next() % words.length];
    if (numbers && index % 10 === 9) word += String(next() % 10);
    if (punctuation && index % 12 === 11) word += [',', '.', ';'][next() % 3];
    result.push(word);
  }
  return result.join(' ');
}
