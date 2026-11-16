import { useEffect, useState } from 'react';
import { BrowserRouter, Link, Outlet, Route, Routes } from 'react-router';
import { RequireSession, type Session } from './RequireSession';
import {
  ChangePasswordPage,
  ForgotPasswordPage,
  LoginPage,
  RegisterPage,
  ResendVerificationPage,
  ResetPasswordPage,
  VerifyEmailPage,
} from './auth/AuthPages';
import { logout, restoreSession, type Account } from './auth/auth-api';
import { apiRequest } from './auth/auth-api';
import { LessonsPage, LessonDetailPage } from './lessons/LessonPages';
import { SpeedPage } from './speed/SpeedPage';
import { PracticePage, ResultPage } from './practice/PracticePages';
import { DashboardPage, HistoryPage } from './progress/ProgressPages';
import { LocaleContext, useT } from './Locale';
import {
  ProfilePage,
  defaultSettings,
  type Settings,
} from './profile/ProfilePage';

type HealthState = 'loading' | 'ok' | 'error';

function Shell({
  area,
  session,
  onLogout,
  settings,
  onSettings,
}: {
  area: 'public' | 'member' | 'admin';
  session: Session | null;
  onLogout: () => Promise<void>;
  settings: Settings;
  onSettings: (value: Settings) => void;
}) {
  const [logoutError, setLogoutError] = useState(false);
  const [appearanceError, setAppearanceError] = useState(false);
  const t = useT();
  async function changeAppearance(next: Settings) {
    setAppearanceError(false);
    try {
      if (session) {
        onSettings(
          (
            await apiRequest<Settings>('/me/settings', {
              method: 'PATCH',
              body: next,
            })
          ).data,
        );
      } else {
        onSettings(next);
        localStorage.setItem('keycat-guest-appearance', JSON.stringify(next));
      }
    } catch {
      setAppearanceError(true);
    }
  }
  return (
    <div className="shell">
      <a className="skip-link" href="#main-content">
        {t('skip')}
      </a>
      <header className="site-header">
        <Link className="brand" to="/" aria-label="KeyCat, về trang chủ">
          KeyCat
        </Link>
        <nav aria-label={t('navLabel')}>
          <Link to="/">{t('home')}</Link>
          {session ? (
            <Link to="/dashboard">{t('dashboard')}</Link>
          ) : (
            <Link to="/register">{t('register')}</Link>
          )}
          {session && (
            <>
              <Link to="/lessons">{t('lessons')}</Link>
              <Link to="/speed-test">Speed Test</Link>
              <Link to="/history">{t('history')}</Link>
              <Link to="/profile">{t('profile')}</Link>
            </>
          )}
          {session ? (
            <Link to="/settings/password">{t('password')}</Link>
          ) : (
            <Link to="/login">{t('login')}</Link>
          )}
          {area === 'admin' && <Link to="/admin">{t('admin')}</Link>}
          {session && (
            <button
              type="button"
              className="nav-button"
              onClick={() => {
                setLogoutError(false);
                void onLogout().catch(() => setLogoutError(true));
              }}
            >
              {t('logout')}
            </button>
          )}
          <label className="header-setting">
            {t('language')}
            <select
              aria-label="Interface language"
              value={settings.uiLanguage}
              onChange={(event) =>
                void changeAppearance({
                  ...settings,
                  uiLanguage: event.target.value as Settings['uiLanguage'],
                })
              }
            >
              <option value="vi">VI</option>
              <option value="en">EN</option>
            </select>
          </label>
          <button
            type="button"
            className="nav-button"
            aria-label={t('theme')}
            onClick={() =>
              void changeAppearance({
                ...settings,
                theme: settings.theme === 'light' ? 'dark' : 'light',
              })
            }
          >
            {settings.theme === 'light' ? 'Dark' : 'Light'}
          </button>
        </nav>
      </header>
      {logoutError && (
        <p className="notice notice-error" role="alert">
          {t('logoutFailure')}
        </p>
      )}
      {appearanceError && (
        <p className="notice notice-error" role="alert">
          {t('appearanceFailure')}
        </p>
      )}
      <main id="main-content">
        <Outlet />
      </main>
      <footer>KeyCat · {t('footer')}</footer>
    </div>
  );
}

function HealthStatus() {
  const t = useT();
  const [health, setHealth] = useState<HealthState>('loading');
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/v1/health', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Health check failed');
        return response.json();
      })
      .then(() => setHealth('ok'))
      .catch((error: unknown) => {
        if (error instanceof Error && error.name !== 'AbortError')
          setHealth('error');
      });
    return () => controller.abort();
  }, []);
  return (
    <p className={`health health-${health}`} role="status">
      {health === 'loading'
        ? t('healthLoading')
        : health === 'ok'
          ? t('healthOk')
          : t('healthError')}
    </p>
  );
}

function LandingPage() {
  const t = useT();
  return (
    <section className="page hero">
      <p className="eyebrow">{t('heroTag')}</p>
      <h1>{t('heroTitle')}</h1>
      <p className="lede">{t('heroDescription')}</p>
      <Link className="button" to="/register">
        {t('createAccount')}
      </Link>
      <HealthStatus />
    </section>
  );
}

function EmptyPage({ title }: { title: string }) {
  return (
    <section className="page narrow">
      <h1>{title}</h1>
      <div className="empty-state" role="status">
        Chưa có dữ liệu để hiển thị.
      </div>
    </section>
  );
}

function NotFoundPage() {
  const t = useT();
  return (
    <section className="page narrow">
      <h1>{t('notFound')}</h1>
      <p>{t('notFoundDetail')}</p>
      <Link to="/">{t('home')}</Link>
    </section>
  );
}

export function AppRoutes({
  session,
  onLogin = () => {},
  onLogout = async () => {},
  onChanged = () => {},
  settings = defaultSettings,
  onSettings = () => {},
}: {
  session: Account | Session | null;
  onLogin?: (user: Account) => void;
  onLogout?: () => Promise<void>;
  onChanged?: () => void;
  settings?: Settings;
  onSettings?: (value: Settings) => void;
}) {
  return (
    <LocaleContext.Provider value={settings.uiLanguage}>
      <Routes>
        <Route
          element={
            <Shell
              area="public"
              session={session}
              onLogout={onLogout}
              settings={settings}
              onSettings={onSettings}
            />
          }
        >
          <Route index element={<LandingPage />} />
          <Route path="login" element={<LoginPage onLogin={onLogin} />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="verify-email" element={<VerifyEmailPage />} />
          <Route
            path="resend-verification"
            element={<ResendVerificationPage />}
          />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
          <Route path="reset-password" element={<ResetPasswordPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        <Route element={<RequireSession session={session} />}>
          <Route
            element={
              <Shell
                area="member"
                session={session}
                onLogout={onLogout}
                settings={settings}
                onSettings={onSettings}
              />
            }
          >
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="lessons" element={<LessonsPage />} />
            <Route
              path="lessons/:lessonId"
              element={<LessonDetailPage account={session as Account} />}
            />
            <Route
              path="speed-test"
              element={<SpeedPage account={session as Account} />}
            />
            <Route
              path="practice/:attemptId"
              element={<PracticePage settings={settings} />}
            />
            <Route path="results/:attemptId" element={<ResultPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route
              path="profile"
              element={
                <ProfilePage
                  account={session as Account}
                  settings={settings}
                  onSettings={onSettings}
                />
              }
            />
            <Route
              path="settings/password"
              element={<ChangePasswordPage onChanged={onChanged} />}
            />
          </Route>
        </Route>
        <Route element={<RequireSession session={session} requireAdmin />}>
          <Route
            element={
              <Shell
                area="admin"
                session={session}
                onLogout={onLogout}
                settings={settings}
                onSettings={onSettings}
              />
            }
          >
            <Route path="admin" element={<EmptyPage title="Quản trị" />} />
          </Route>
        </Route>
      </Routes>
    </LocaleContext.Provider>
  );
}

export default function App() {
  const [session, setSession] = useState<Account | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      return {
        ...defaultSettings,
        ...JSON.parse(localStorage.getItem('keycat-guest-appearance') || '{}'),
      };
    } catch {
      return defaultSettings;
    }
  });
  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
    document.documentElement.lang = settings.uiLanguage;
  }, [settings]);
  useEffect(() => {
    if (!session) return;
    let active = true;
    void apiRequest<Settings>('/me/settings')
      .then((response) => {
        if (active) setSettings(response.data);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [session?.id]);
  useEffect(() => {
    let active = true;
    void restoreSession().then((user) => {
      if (active) {
        setSession(user);
        setRestoring(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);
  return (
    <BrowserRouter>
      {restoring ? (
        <main className="page narrow" role="status">
          {settings.uiLanguage === 'en'
            ? 'Restoring session…'
            : 'Đang khôi phục phiên…'}
        </main>
      ) : (
        <AppRoutes
          session={session}
          onLogin={setSession}
          onLogout={async () => {
            await logout();
            setSession(null);
            try {
              setSettings({
                ...defaultSettings,
                ...JSON.parse(
                  localStorage.getItem('keycat-guest-appearance') || '{}',
                ),
              });
            } catch {
              setSettings(defaultSettings);
            }
          }}
          onChanged={() => setSession(null)}
          settings={settings}
          onSettings={setSettings}
        />
      )}
    </BrowserRouter>
  );
}
