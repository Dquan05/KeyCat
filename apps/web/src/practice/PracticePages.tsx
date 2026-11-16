import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  initialState,
  metrics,
  normalizeKey,
  reduceEvent,
  MAX_EVENTS,
  MAX_PROOF_BYTES,
  type TypingEvent,
  type TypingState,
} from '../../../../packages/typing-core/src/index';
import { apiMessage } from '../auth/auth-api';
import { useStatusLabel, useT } from '../Locale';
import {
  abandonAttempt,
  finishAttempt,
  getAttempt,
  startAttempt,
  type Attempt,
  type AttemptRead,
  type Result,
} from './practice-api';

type Stored = {
  attempt: Attempt;
  events: TypingEvent[];
  pending?: { key: string; body: unknown };
  source: string;
  pauseStarted?: number;
  pausedMs?: number;
  inputStarted?: number;
};
const storageKey = (id: string) => `keycat-attempt:${id}`;
function readStored(id: string): Stored | null {
  try {
    return JSON.parse(
      sessionStorage.getItem(storageKey(id)) || 'null',
    ) as Stored | null;
  } catch {
    return null;
  }
}
function saveStored(value: Stored) {
  sessionStorage.setItem(
    storageKey(value.attempt.attemptId),
    JSON.stringify(value),
  );
}
export function saveAttempt(attempt: Attempt, source: string) {
  saveStored({ attempt, events: [], source });
}
export function deviceSupported() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(pointer: fine)').matches &&
    window.innerWidth >= 720
  );
}
export function resultPath(id: string) {
  return `/results/${encodeURIComponent(id)}`;
}

function ResultView({ result }: { result: Result }) {
  const t = useT();
  return (
    <div className="result-grid">
      <p>
        <strong>{result.effectiveWpm ?? '—'}</strong>
        <span>{t('officialWpm')}</span>
      </p>
      <p>
        <strong>
          {result.firstTryAccuracy === null
            ? '—'
            : `${result.firstTryAccuracy}%`}
        </strong>
        <span>{t('firstAccuracy')}</span>
      </p>
      {result.score !== null && (
        <p>
          <strong>{result.score}</strong>
          <span>{t('score')}</span>
        </p>
      )}
      {result.stars !== null && (
        <p>
          <strong>{result.stars}/5</strong>
          <span>{t('stars')}</span>
        </p>
      )}
      <p>
        <strong>{result.verified ? t('verified') : t('unverified')}</strong>
        <span>{t('status')}</span>
      </p>
    </div>
  );
}

export function ResultPage() {
  const t = useT();
  const statusLabel = useStatusLabel();
  const { attemptId = '' } = useParams();
  const [data, setData] = useState<AttemptRead | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const stored = readStored(attemptId);
  async function load() {
    setLoading(true);
    setError('');
    try {
      setData(await getAttempt(attemptId));
    } catch (cause) {
      setError(apiMessage(cause));
    } finally {
      setLoading(false);
    }
  }
  async function retry() {
    if (!data || !deviceSupported()) return;
    setRetrying(true);
    setError('');
    try {
      const attempt = await startAttempt(data.targetId, data.mode);
      saveAttempt(
        attempt,
        stored?.source || (data.mode === 'LESSON' ? '/lessons' : '/speed-test'),
      );
      window.location.assign(`/practice/${attempt.attemptId}`);
    } catch (cause) {
      setError(apiMessage(cause));
      setRetrying(false);
    }
  }
  useEffect(() => {
    void load();
  }, [attemptId]);
  return (
    <section className="page">
      <p className="eyebrow">{t('official')}</p>
      <h1>{t('result')}</h1>
      {loading && <p role="status">{t('loadingResult')}</p>}
      {error && (
        <div className="notice notice-error" role="alert">
          {error} <button onClick={() => void load()}>{t('retry')}</button>
        </div>
      )}
      {data && (
        <>
          <p>
            {t('status')}: <strong>{statusLabel(data.status)}</strong>
          </p>
          {data.result ? (
            <ResultView result={data.result} />
          ) : (
            <p className="empty-state">{t('noOfficial')}</p>
          )}
          <div className="actions">
            <button
              className="button"
              disabled={retrying || !deviceSupported()}
              onClick={() => void retry()}
            >
              {retrying ? t('loading') : t('retryPractice')}
            </button>
            <Link to="/history">{t('history')}</Link>
          </div>
        </>
      )}
    </section>
  );
}

const keyboardRows = ['1234567890', 'qwertyuiop', 'asdfghjkl;', 'zxcvbnm,./'];
function KeyboardHint({
  next,
  showHands,
}: {
  next: string;
  showHands: boolean;
}) {
  const t = useT();
  const finger = 'qaz'.includes(next.toLowerCase())
    ? 'ngón út trái'
    : 'p;/.'.includes(next.toLowerCase())
      ? 'ngón út phải'
      : 'ngón tay phù hợp';
  return (
    <div className="keyboard-hint" aria-label="Gợi ý bàn phím">
      {keyboardRows.map((row) => (
        <div className="keyboard-row" key={row}>
          {[...row].map((key) => (
            <kbd
              className={key === next.toLowerCase() ? 'active-key' : ''}
              key={key}
            >
              {key}
            </kbd>
          ))}
        </div>
      ))}
      {showHands && (
        <p>
          {t('nextKey')}: <strong>{next === ' ' ? 'Space' : next}</strong> ·{' '}
          {finger}
        </p>
      )}
    </div>
  );
}

export function PracticePage({
  settings,
}: {
  settings: {
    showKeyboard: boolean;
    showHands: boolean;
    typingFont: string;
    fontSize: number;
  };
}) {
  const t = useT();
  const { attemptId = '' } = useParams();
  const navigate = useNavigate();
  const [stored, setStored] = useState<Stored | null>(() =>
    readStored(attemptId),
  );
  const [state, setState] = useState<TypingState>(() => {
    const saved = readStored(attemptId);
    if (!saved) return initialState('');
    try {
      return saved.events.reduce(
        reduceEvent,
        initialState(saved.attempt.content.text),
      );
    } catch {
      return initialState(saved.attempt.content.text);
    }
  });
  const [serverStatus, setServerStatus] = useState('loading');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [clock, setClock] = useState(0);
  const inputRef = useRef<HTMLDivElement>(null);
  const storedRef = useRef(stored);
  const stateRef = useRef(state);
  storedRef.current = stored;
  stateRef.current = state;
  useEffect(() => {
    if (!stored) {
      setServerStatus('missing');
      return;
    }
    let active = true;
    void getAttempt(attemptId)
      .then((data) => {
        if (!active) return;
        if (
          data.status === 'COMPLETED' ||
          data.status === 'ABANDONED' ||
          data.status === 'EXPIRED'
        ) {
          saveStored({ ...stored, events: [], pending: undefined });
          navigate(resultPath(attemptId), { replace: true });
        } else setServerStatus('ready');
      })
      .catch((cause) => {
        if (active) {
          setError(apiMessage(cause));
          setServerStatus('error');
        }
      });
    return () => {
      active = false;
    };
  }, [attemptId, navigate]);

  function elapsed(saved: Stored) {
    if (!saved.inputStarted) return 0;
    return Math.max(
      0,
      Math.floor(
        (saved.pauseStarted ?? Date.now()) -
          saved.inputStarted -
          (saved.pausedMs ?? 0),
      ),
    );
  }
  function append(event: TypingEvent) {
    const saved = storedRef.current;
    if (!saved || saved.pending) return;
    try {
      const nextState = reduceEvent(stateRef.current, event);
      const next = { ...saved, events: [...saved.events, event] };
      if (
        next.events.length > MAX_EVENTS ||
        new TextEncoder().encode(
          JSON.stringify({ eventLogVersion: 1, events: next.events }),
        ).length > MAX_PROOF_BYTES
      ) {
        setError(t('eventLimit'));
        return;
      }
      saveStored(next);
      storedRef.current = next;
      stateRef.current = nextState;
      setStored(next);
      setState(nextState);
      if (saved.attempt.mode !== 'SPEED_TIME' && metrics(nextState).completed)
        void submit(next);
    } catch {
      setError(t('badKey'));
    }
  }
  async function submit(saved: Stored) {
    if (saved.pending) return;
    const body =
      saved.attempt.content.kind === 'INTRO'
        ? { eventLogVersion: 2, acknowledged: true }
        : { eventLogVersion: 1, events: saved.events };
    const next = { ...saved, pending: { key: crypto.randomUUID(), body } };
    saveStored(next);
    storedRef.current = next;
    setStored(next);
    await retryFinish(next);
  }
  async function retryFinish(saved: Stored) {
    if (!saved.pending || submitting) return;
    if (Date.now() >= Date.parse(saved.attempt.expiresAt)) {
      setError(t('expiredAttempt'));
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await finishAttempt(
        saved.attempt.attemptId,
        saved.pending.body,
        saved.pending.key,
      );
      saveStored({ ...saved, events: [], pending: undefined });
      navigate(resultPath(saved.attempt.attemptId), { replace: true });
    } catch (cause) {
      setError(`${apiMessage(cause)} ${t('pendingRetry')}`);
    } finally {
      setSubmitting(false);
    }
  }
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const saved = storedRef.current;
    if (
      !saved ||
      serverStatus !== 'ready' ||
      saved.pending ||
      stateRef.current.paused ||
      submitting
    )
      return;
    if (event.key === 'Escape') {
      inputRef.current?.blur();
      return;
    }
    if (
      event.nativeEvent.isComposing ||
      event.ctrlKey ||
      event.altKey ||
      event.metaKey
    )
      return;
    const normalized = normalizeKey(
      event.key,
      true,
      saved.attempt.content.text[stateRef.current.cursor],
      true,
      {
        shift: event.shiftKey,
        capsLock: event.getModifierState('CapsLock'),
      },
    );
    if (!normalized) return;
    if (normalized.preventDefault) event.preventDefault();
    if (normalized.kind === 'BACKSPACE' && stateRef.current.cursor === 0)
      return;
    let current = saved;
    if (!current.inputStarted) {
      current = { ...current, inputStarted: Date.now() };
      saveStored(current);
      storedRef.current = current;
      setStored(current);
    }
    append({
      seq: stateRef.current.lastSeq + 1,
      kind: normalized.kind,
      ...(normalized.char ? { char: normalized.char } : {}),
      activeTimeMs: elapsed(current),
      shift: event.shiftKey,
      capsLock: event.getModifierState('CapsLock'),
    });
  }
  useEffect(() => {
    const interval = window.setInterval(() => {
      const saved = storedRef.current;
      if (
        !saved ||
        !saved.inputStarted ||
        saved.pending ||
        stateRef.current.paused ||
        serverStatus !== 'ready'
      )
        return;
      const now = elapsed(saved);
      setClock(now);
      if (
        saved.attempt.mode === 'SPEED_TIME' &&
        saved.attempt.configSnapshot.preset &&
        now >= saved.attempt.configSnapshot.preset * 1000
      ) {
        const event: TypingEvent = {
          seq: stateRef.current.lastSeq + 1,
          kind: 'TIMEOUT',
          activeTimeMs: Math.max(
            saved.attempt.configSnapshot.preset * 1000,
            stateRef.current.lastActiveTimeMs,
          ),
        };
        append(event);
        const updated = storedRef.current;
        if (updated) void submit(updated);
      }
    }, 100);
    return () => window.clearInterval(interval);
  }, [serverStatus]);
  useEffect(() => {
    function visibility() {
      const saved = storedRef.current;
      if (!saved?.inputStarted || saved.pending) return;
      if (
        (document.hidden || !document.hasFocus()) &&
        !stateRef.current.paused
      ) {
        const next = { ...saved, pauseStarted: Date.now() };
        saveStored(next);
        storedRef.current = next;
        setStored(next);
        append({
          seq: stateRef.current.lastSeq + 1,
          kind: 'PAUSE',
          activeTimeMs: elapsed(next),
        });
      } else if (!document.hidden && stateRef.current.paused) {
        const next = {
          ...saved,
          pausedMs:
            (saved.pausedMs ?? 0) +
            (Date.now() - (saved.pauseStarted ?? Date.now())),
          pauseStarted: undefined,
        };
        saveStored(next);
        storedRef.current = next;
        setStored(next);
        append({
          seq: stateRef.current.lastSeq + 1,
          kind: 'RESUME',
          activeTimeMs: stateRef.current.lastActiveTimeMs,
        });
      }
    }
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('blur', visibility);
    window.addEventListener('focus', visibility);
    if (stateRef.current.paused && document.hasFocus()) visibility();
    return () => {
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('blur', visibility);
      window.removeEventListener('focus', visibility);
    };
  }, []);
  async function abandon() {
    const saved = storedRef.current;
    if (!saved) return;
    try {
      await abandonAttempt(saved.attempt.attemptId, crypto.randomUUID());
      navigate(saved.source);
    } catch (cause) {
      setError(apiMessage(cause));
    }
  }
  if (!stored || serverStatus === 'missing')
    return (
      <section className="page narrow">
        <h1>{t('missingAttempt')}</h1>
        <p className="notice">{t('missingAttemptDetail')}</p>
        <Link to="/history">{t('history')}</Link>
      </section>
    );
  const isIntro = stored.attempt.content.kind === 'INTRO';
  const preview = metrics(state);
  const visibleStart = Math.max(0, state.cursor - 80);
  const visibleText = stored.attempt.content.text.slice(
    visibleStart,
    Math.max(visibleStart + 250, state.cursor + 200),
  );
  const remaining =
    stored.attempt.mode === 'SPEED_TIME'
      ? Math.max(
          0,
          (stored.attempt.configSnapshot.preset ?? 0) -
            Math.floor(clock / 1000),
        )
      : null;
  return (
    <section className="page practice-page">
      <p className="eyebrow">
        {stored.attempt.mode === 'LESSON' ? 'Bài học' : 'Speed Test'} · Đang
        luyện
      </p>
      <h1>{isIntro ? t('intro') : t('typeText')}</h1>
      {serverStatus === 'loading' && <p role="status">Đang kiểm tra phiên…</p>}
      {error && (
        <p className="notice notice-error" role="alert">
          {error}
        </p>
      )}
      {serverStatus === 'error' && (
        <button
          onClick={() =>
            void getAttempt(attemptId)
              .then(() => setServerStatus('ready'))
              .catch((cause) => setError(apiMessage(cause)))
          }
        >
          {t('retry')}
        </button>
      )}
      {isIntro ? (
        <>
          <p className="lesson-intro">{stored.attempt.content.text}</p>
          <button
            disabled={submitting || serverStatus !== 'ready'}
            onClick={() => void submit(stored)}
          >
            {t('readingDone')}
          </button>
        </>
      ) : (
        <>
          <div className="metrics-strip" aria-label="Chỉ số tạm tính">
            <span>
              {t('wpm')}: {preview.effectiveWpm}
            </span>
            <span>
              {t('accuracy')}: {preview.firstTryAccuracy}%
            </span>
            <span>
              {remaining === null
                ? `${t('timeElapsed')}: ${Math.floor(clock / 1000)}s`
                : `${t('timeRemaining')}: ${remaining}s`}
            </span>
          </div>
          {serverStatus === 'ready' && (
            <div
              ref={inputRef}
              className="typing-area"
              role="textbox"
              aria-label="Vùng luyện gõ"
              aria-multiline="false"
              tabIndex={0}
              onKeyDown={onKeyDown}
              style={{
                fontFamily: settings.typingFont,
                fontSize: settings.fontSize,
              }}
            >
              {[...visibleText].map((char, offset) => {
                const index = visibleStart + offset;
                return (
                  <span
                    key={index}
                    className={
                      index === state.cursor
                        ? 'cursor-char'
                        : index < state.cursor
                          ? state.typed[index] === char
                            ? 'correct-char'
                            : 'wrong-char'
                          : ''
                    }
                  >
                    {char === ' ' ? '\u00a0' : char}
                  </span>
                );
              })}
            </div>
          )}
          <p>{t('typingInstruction')}</p>
          {settings.showKeyboard && (
            <KeyboardHint
              next={stored.attempt.content.text[state.cursor] ?? ''}
              showHands={settings.showHands}
            />
          )}
        </>
      )}
      {stored.pending && (
        <div className="notice" role="status">
          <p>{t('pendingResult')}</p>
          <button
            disabled={submitting}
            onClick={() => void retryFinish(stored)}
          >
            {submitting ? t('loading') : t('retryResult')}
          </button>
        </div>
      )}
      <div className="actions">
        <button
          type="button"
          disabled={submitting || !!stored.pending}
          onClick={() => void abandon()}
        >
          {t('exit')}
        </button>
        <Link to={stored.source}>{t('back')}</Link>
      </div>
    </section>
  );
}
