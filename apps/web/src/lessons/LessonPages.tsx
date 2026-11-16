import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { apiMessage, apiRequest, type Account } from '../auth/auth-api';
import { deviceSupported, saveAttempt } from '../practice/PracticePages';
import { startAttempt } from '../practice/practice-api';
import { useT } from '../Locale';

type Lesson = {
  id: string;
  title: string;
  lessonType: string;
  courseOrdinal: number;
  goalWpm: number | null;
  minAccuracy: number | null;
  practiceTargetId: string | null;
  available?: boolean;
  best: { stars: number; effectiveWpm: number | null; score?: number } | null;
};
type Page = { items: Lesson[]; nextCursor?: string | null };
export function LessonsPage() {
  const t = useT();
  const [items, setItems] = useState<Lesson[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  async function load(next?: string) {
    setLoading(true);
    setError('');
    try {
      const response = await apiRequest<Page>(
        `/lessons?limit=20${next ? `&cursor=${encodeURIComponent(next)}` : ''}`,
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
      <p className="eyebrow">Giáo trình</p>
      <h1>{t('lessons')}</h1>
      <p>{t('chooseAny')}</p>
      {error && (
        <p className="notice notice-error" role="alert">
          {error} <button onClick={() => void load()}>{t('retry')}</button>
        </p>
      )}
      {loading && !items.length && <p role="status">{t('loadingLessons')}</p>}
      {!loading && !items.length && !error && (
        <p className="empty-state">{t('noLessons')}</p>
      )}
      <div className="card-grid">
        {items.map((item) => (
          <article className="card" key={item.id}>
            <p className="eyebrow">
              Bài {item.courseOrdinal} · {item.lessonType}
            </p>
            <h2>{item.title}</h2>
            <p>
              {item.best
                ? `${t('best')}: ${item.best.stars} ${t('stars')} · ${item.best.effectiveWpm ?? '—'} WPM`
                : t('notPracticed')}
            </p>
            <Link to={`/lessons/${item.id}`}>{t('viewLesson')}</Link>
          </article>
        ))}
      </div>
      {cursor && (
        <button disabled={loading} onClick={() => void load(cursor)}>
          {loading ? t('loading') : t('viewMore')}
        </button>
      )}
    </section>
  );
}
export function LessonDetailPage({ account }: { account: Account }) {
  const t = useT();
  const { lessonId = '' } = useParams();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  async function load() {
    setLoading(true);
    setError('');
    try {
      setLesson(
        (await apiRequest<Lesson>(`/lessons/${encodeURIComponent(lessonId)}`))
          .data,
      );
    } catch (cause) {
      setError(apiMessage(cause));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, [lessonId]);
  async function start() {
    if (!lesson?.practiceTargetId) return;
    setStarting(true);
    setError('');
    try {
      const attempt = await startAttempt(lesson.practiceTargetId, 'LESSON');
      saveAttempt(attempt, `/lessons/${lessonId}`);
      navigate(`/practice/${attempt.attemptId}`);
    } catch (cause) {
      setError(apiMessage(cause));
    } finally {
      setStarting(false);
    }
  }
  return (
    <section className="page narrow">
      <Link to="/lessons">← {t('lessons')}</Link>
      {loading && <p role="status">{t('loadingDetail')}</p>}
      {error && (
        <p className="notice notice-error" role="alert">
          {error} <button onClick={() => void load()}>{t('retry')}</button>
        </p>
      )}
      {lesson && (
        <>
          <p className="eyebrow">
            Bài {lesson.courseOrdinal} · {lesson.lessonType}
          </p>
          <h1>{lesson.title}</h1>
          {lesson.goalWpm !== null && (
            <p>
              {t('lessonGoal')}: {lesson.goalWpm} WPM · {t('minAccuracy')}:{' '}
              {lesson.minAccuracy}%
            </p>
          )}
          <p>
            {lesson.best
              ? `${t('best')}: ${lesson.best.stars} ${t('stars')}`
              : t('notPracticed')}
          </p>
          {!account.emailVerified && (
            <p className="notice notice-error">{t('verifyToStart')}</p>
          )}
          {!deviceSupported() && (
            <p className="notice notice-error">{t('unsupported')}</p>
          )}
          {!lesson.available && (
            <p className="notice notice-error">{t('unavailable')}</p>
          )}
          <button
            className="button"
            disabled={
              starting ||
              !account.emailVerified ||
              !deviceSupported() ||
              !lesson.available
            }
            onClick={() => void start()}
          >
            {starting ? t('loading') : t('start')}
          </button>
        </>
      )}
    </section>
  );
}
