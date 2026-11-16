import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { apiMessage, apiRequest, type Account } from '../auth/auth-api';
import { deviceSupported, saveAttempt } from '../practice/PracticePages';
import { startAttempt } from '../practice/practice-api';
import { useT } from '../Locale';

type Config = {
  id: string;
  practiceTargetId: string;
  mode: 'TIME' | 'WORDS';
  timeLimitSec: number | null;
  wordTarget: number | null;
  punctuationEnabled: boolean;
  numbersEnabled: boolean;
};
export function SpeedPage({ account }: { account: Account }) {
  const t = useT();
  const navigate = useNavigate();
  const [configs, setConfigs] = useState<Config[]>([]);
  const [mode, setMode] = useState<'TIME' | 'WORDS'>('TIME');
  const [preset, setPreset] = useState(60);
  const [punctuation, setPunctuation] = useState(false);
  const [numbers, setNumbers] = useState(false);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  async function load() {
    setLoading(true);
    setError('');
    try {
      setConfigs(
        (await apiRequest<{ items: Config[] }>('/speed-test/configs')).data
          .items,
      );
    } catch (cause) {
      setError(apiMessage(cause));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  const available = configs.filter(
    (item) =>
      item.mode === mode &&
      item.punctuationEnabled === punctuation &&
      item.numbersEnabled === numbers,
  );
  const presets = [
    ...new Set(
      available.map((item) =>
        mode === 'TIME' ? item.timeLimitSec! : item.wordTarget!,
      ),
    ),
  ];
  const activePreset = presets.includes(preset) ? preset : presets[0];
  const selected = available.find(
    (item) =>
      (mode === 'TIME' ? item.timeLimitSec : item.wordTarget) === activePreset,
  );
  async function start() {
    if (!selected) return;
    setStarting(true);
    setError('');
    try {
      const attempt = await startAttempt(
        selected.practiceTargetId,
        mode === 'TIME' ? 'SPEED_TIME' : 'SPEED_WORDS',
      );
      saveAttempt(attempt, '/speed-test');
      navigate(`/practice/${attempt.attemptId}`);
    } catch (cause) {
      setError(apiMessage(cause));
    } finally {
      setStarting(false);
    }
  }
  return (
    <section className="page narrow">
      <p className="eyebrow">Speed Test</p>
      <h1>{t('speed')}</h1>
      {loading && <p role="status">{t('loadingConfig')}</p>}
      {error && (
        <p className="notice notice-error" role="alert">
          {error} <button onClick={() => void load()}>{t('retry')}</button>
        </p>
      )}
      <fieldset disabled={loading || starting}>
        <legend>{t('mode')}</legend>
        <label>
          <input
            type="radio"
            checked={mode === 'TIME'}
            onChange={() => {
              setMode('TIME');
              setPreset(60);
            }}
          />{' '}
          {t('time')}
        </label>
        <label>
          <input
            type="radio"
            checked={mode === 'WORDS'}
            onChange={() => {
              setMode('WORDS');
              setPreset(25);
            }}
          />{' '}
          {t('words')}
        </label>
      </fieldset>
      <fieldset disabled={loading || starting}>
        <legend>{t('options')}</legend>
        <label>
          <input
            type="checkbox"
            checked={punctuation}
            onChange={(event) => setPunctuation(event.target.checked)}
          />{' '}
          {t('punctuation')}
        </label>
        <label>
          <input
            type="checkbox"
            checked={numbers}
            onChange={(event) => setNumbers(event.target.checked)}
          />{' '}
          {t('numbers')}
        </label>
      </fieldset>
      <label htmlFor="speed-preset">
        {mode === 'TIME' ? t('duration') : t('wordCount')}
      </label>
      <select
        id="speed-preset"
        value={activePreset ?? ''}
        onChange={(event) => setPreset(Number(event.target.value))}
        disabled={loading || starting || !presets.length}
      >
        {presets.map((value) => (
          <option key={value} value={value}>
            {value} {mode === 'TIME' ? t('secondsUnit') : t('wordsUnit')}
          </option>
        ))}
      </select>
      {!loading && !selected && <p className="empty-state">{t('noConfig')}</p>}
      {!account.emailVerified && (
        <p className="notice notice-error">{t('verifyToStart')}</p>
      )}
      {!deviceSupported() && (
        <p className="notice notice-error">{t('unsupported')}</p>
      )}
      <button
        className="button"
        disabled={
          !selected || starting || !account.emailVerified || !deviceSupported()
        }
        onClick={() => void start()}
      >
        {starting ? t('loading') : t('startSpeed')}
      </button>
    </section>
  );
}
