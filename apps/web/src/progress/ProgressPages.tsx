import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { apiMessage, apiRequest } from '../auth/auth-api';
import { resultPath } from '../practice/PracticePages';
import { useStatusLabel, useT } from '../Locale';

type Stats = {
  empty: boolean;
  attemptsCompleted: number;
  lessonsPracticed: number;
  lessonsPassed: number;
  totalActiveMs: number;
  averageWpm: number | null;
  averageFirstTryAccuracy: number | null;
  chart: { day: string; averageWpm: number; attempts: number }[];
  weakKeys: { key: string; mistakeRate: number }[];
};
type HistoryItem = {
  attemptId: string;
  mode: string;
  status: string;
  title: string | null;
  createdAt: string;
  result: {
    effectiveWpm?: number | null;
    firstTryAccuracy?: number | null;
    score?: number | null;
  } | null;
};
function HistoryList({ items }: { items: HistoryItem[] }) {
  const t = useT();
  const statusLabel = useStatusLabel();
  return (
    <div className="history-list">
      {items.map((item) => (
        <article className="card" key={item.attemptId}>
          <div>
            <h3>{item.title || item.mode}</h3>
            <p>
              {new Date(item.createdAt).toLocaleString()} ·{' '}
              {statusLabel(item.status)}
            </p>
            <p>
              {item.result?.effectiveWpm ?? '—'} WPM ·{' '}
              {item.result?.firstTryAccuracy ?? '—'}% chính xác
            </p>
          </div>
          <Link to={resultPath(item.attemptId)}>{t('viewResult')}</Link>
        </article>
      ))}
    </div>
  );
}
export function DashboardPage() {
  const t = useT();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<HistoryItem[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true);
    setError('');
    try {
      const [s, h] = await Promise.all([
        apiRequest<Stats>('/me/stats'),
        apiRequest<{ items: HistoryItem[] }>('/me/history?limit=5'),
      ]);
      setStats(s.data);
      setRecent(h.data.items);
    } catch (cause) {
      setError(apiMessage(cause));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  return (
    <section className="page">
      <p className="eyebrow">Tiến độ</p>
      <h1>{t('dashboard')}</h1>
      {loading && <p role="status">{t('loadingProgress')}</p>}
      {error && (
        <p className="notice notice-error" role="alert">
          {error} <button onClick={() => void load()}>{t('retry')}</button>
        </p>
      )}
      {stats?.empty && (
        <div className="empty-state">
          <p>{t('noResults')}</p>
          <Link to="/lessons">{t('chooseLesson')}</Link> ·{' '}
          <Link to="/speed-test">Speed Test</Link>
        </div>
      )}
      {stats && !stats.empty && (
        <>
          <div className="result-grid">
            <p>
              <strong>{stats.attemptsCompleted}</strong>
              <span>{t('completed')}</span>
            </p>
            <p>
              <strong>{stats.lessonsPracticed}</strong>
              <span>{t('practiced')}</span>
            </p>
            <p>
              <strong>{stats.lessonsPassed}</strong>
              <span>{t('passed')}</span>
            </p>
            <p>
              <strong>{stats.averageWpm ?? '—'}</strong>
              <span>{t('averageWpm')}</span>
            </p>
            <p>
              <strong>{stats.averageFirstTryAccuracy ?? '—'}%</strong>
              <span>{t('averageAccuracy')}</span>
            </p>
            <p>
              <strong>{Math.round(stats.totalActiveMs / 60000)} phút</strong>
              <span>{t('activeTime')}</span>
            </p>
          </div>
          <h2>{t('chart')}</h2>
          <div
            className="chart"
            role="img"
            aria-label="Biểu đồ WPM trung bình theo ngày"
          >
            {stats.chart.map((point) => (
              <div className="chart-column" key={point.day}>
                <span
                  title={`${point.day}: ${point.averageWpm} WPM`}
                  style={{
                    height: `${Math.max(3, Math.min(100, point.averageWpm))}%`,
                  }}
                />
                <small>{point.day.slice(5)}</small>
              </div>
            ))}
          </div>
          {stats.weakKeys.length > 0 && (
            <p>
              Phím cần luyện thêm:{' '}
              {stats.weakKeys.map((item) => item.key).join(', ')}
            </p>
          )}
        </>
      )}
      {recent.length > 0 && (
        <>
          <h2>{t('recent')}</h2>
          <HistoryList items={recent} />
          <Link to="/history">{t('viewAll')}</Link>
        </>
      )}
    </section>
  );
}
export function HistoryPage() {
  const t = useT();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  async function load(next?: string) {
    setLoading(true);
    setError('');
    try {
      const response = await apiRequest<{ items: HistoryItem[] }>(
        `/me/history?limit=20${next ? `&cursor=${encodeURIComponent(next)}` : ''}`,
      );
      setItems((old) =>
        next ? [...old, ...response.data.items] : response.data.items,
      );
      setCursor(response.meta.nextCursor ?? null);
    } catch (cause) {
      setError(apiMessage(cause));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  return (
    <section className="page">
      <p className="eyebrow">Tiến độ</p>
      <h1>{t('history')}</h1>
      {loading && !items.length && <p role="status">{t('loadingHistory')}</p>}
      {error && (
        <p className="notice notice-error" role="alert">
          {error} <button onClick={() => void load()}>{t('retry')}</button>
        </p>
      )}
      {!loading && !items.length && !error && (
        <p className="empty-state">
          {t('noHistory')} <Link to="/lessons">{t('chooseLesson')}</Link>
        </p>
      )}
      <HistoryList items={items} />
      {cursor && (
        <button disabled={loading} onClick={() => void load(cursor)}>
          {loading ? t('loading') : t('viewMore')}
        </button>
      )}
    </section>
  );
}
