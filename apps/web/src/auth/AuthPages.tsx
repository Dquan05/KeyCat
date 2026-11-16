import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useT } from '../Locale';
import {
  authMessage,
  changePassword,
  forgotPassword,
  login,
  register,
  resendVerification,
  resetPassword,
  verifyEmail,
  type Account,
} from './auth-api';

function Notice({
  message,
  error = false,
}: {
  message: string;
  error?: boolean;
}) {
  return (
    <p
      className={error ? 'notice notice-error' : 'notice'}
      role={error ? 'alert' : 'status'}
    >
      {message}
    </p>
  );
}

export function LoginPage({ onLogin }: { onLogin: (user: Account) => void }) {
  const t = useT();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      onLogin(await login(email, password));
      navigate('/dashboard');
    } catch (reason) {
      setError(authMessage(reason));
    } finally {
      setLoading(false);
    }
  }
  return (
    <section className="page narrow">
      <p className="eyebrow">{t('account')}</p>
      <h1>{t('login')}</h1>
      <form onSubmit={submit}>
        <label htmlFor="login-email">{t('email')}</label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <label htmlFor="login-password">{t('loginPassword')}</label>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {error && <Notice message={error} error />}
        <button type="submit" disabled={loading}>
          {loading ? t('loading') : t('login')}
        </button>
      </form>
      <p>
        <Link to="/register">{t('createAccount')}</Link> ·{' '}
        <Link to="/forgot-password">{t('forgotPassword')}</Link>
      </p>
    </section>
  );
}

export function RegisterPage() {
  const t = useT();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      await register(email, username, password);
      setMessage(t('registeredNotice'));
    } catch (reason) {
      setError(authMessage(reason));
    } finally {
      setLoading(false);
    }
  }
  return (
    <section className="page narrow">
      <p className="eyebrow">{t('accountNew')}</p>
      <h1>{t('register')}</h1>
      <form onSubmit={submit}>
        <label htmlFor="register-email">{t('email')}</label>
        <input
          id="register-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <label htmlFor="register-username">{t('username')}</label>
        <input
          id="register-username"
          autoComplete="username"
          required
          maxLength={80}
          value={username}
          onChange={(event) => setUsername(event.target.value)}
        />
        <label htmlFor="register-password">{t('passwordLength')}</label>
        <input
          id="register-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={15}
          maxLength={128}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {error && <Notice message={error} error />}
        {message && <Notice message={message} />}
        <button type="submit" disabled={loading}>
          {loading ? t('loading') : t('createAccount')}
        </button>
      </form>
      <p>
        <Link to="/login">{t('haveAccount')}</Link>
      </p>
    </section>
  );
}

export function VerifyEmailPage() {
  const t = useT();
  const [params] = useSearchParams();
  const token = params.get('token');
  const started = useRef(false);
  const [state, setState] = useState<'loading' | 'success' | 'error'>(
    token ? 'loading' : 'error',
  );
  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    void verifyEmail(token)
      .then(() => setState('success'))
      .catch(() => setState('error'));
    window.history.replaceState({}, '', '/verify-email');
  }, [token]);
  return (
    <section className="page narrow">
      <h1>{t('verifyEmail')}</h1>
      {state === 'loading' ? (
        <Notice message={t('verifying')} />
      ) : state === 'success' ? (
        <Notice message={t('verifiedNotice')} />
      ) : (
        <Notice message={t('invalidLink')} error />
      )}
      <p>
        <Link to="/resend-verification">{t('resendVerification')}</Link> ·{' '}
        <Link to="/login">{t('login')}</Link>
      </p>
    </section>
  );
}

export function ResendVerificationPage() {
  const t = useT();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      await resendVerification(email);
      setMessage(t('resendNotice'));
    } catch (reason) {
      setError(authMessage(reason));
    } finally {
      setLoading(false);
    }
  }
  return (
    <section className="page narrow">
      <h1>{t('resendVerification')}</h1>
      <form onSubmit={submit}>
        <label htmlFor="resend-email">{t('email')}</label>
        <input
          id="resend-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        {error && <Notice message={error} error />}
        {message && <Notice message={message} />}
        <button type="submit" disabled={loading}>
          {loading ? t('loading') : t('resendVerification')}
        </button>
      </form>
    </section>
  );
}

export function ForgotPasswordPage() {
  const t = useT();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      await forgotPassword(email);
      setMessage(t('forgotNotice'));
    } catch (reason) {
      setError(authMessage(reason));
    } finally {
      setLoading(false);
    }
  }
  return (
    <section className="page narrow">
      <h1>{t('forgotPasswordTitle')}</h1>
      <form onSubmit={submit}>
        <label htmlFor="forgot-email">{t('email')}</label>
        <input
          id="forgot-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        {error && <Notice message={error} error />}
        {message && <Notice message={message} />}
        <button type="submit" disabled={loading}>
          {loading ? t('loading') : t('sendLink')}
        </button>
      </form>
    </section>
  );
}

export function ResetPasswordPage() {
  const t = useT();
  const [params] = useSearchParams();
  const [token] = useState(() => params.get('token'));
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (token) window.history.replaceState({}, '', '/reset-password');
  }, [token]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setError('');
    setLoading(true);
    try {
      await resetPassword(token, password);
      setMessage(t('resetNotice'));
      navigate('/reset-password', { replace: true });
    } catch (reason) {
      setError(authMessage(reason));
    } finally {
      setLoading(false);
    }
  }
  return (
    <section className="page narrow">
      <h1>{t('resetPasswordTitle')}</h1>
      {!token && !message ? (
        <Notice message={t('invalidLink')} error />
      ) : (
        <form onSubmit={submit}>
          <label htmlFor="reset-password">{t('newPasswordLength')}</label>
          <input
            id="reset-password"
            type="password"
            autoComplete="new-password"
            minLength={15}
            maxLength={128}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={!!message}
          />
          {error && <Notice message={error} error />}
          {message && <Notice message={message} />}
          <button type="submit" disabled={loading || !!message}>
            {loading ? t('loading') : t('password')}
          </button>
        </form>
      )}
      <p>
        <Link to="/forgot-password">{t('newLink')}</Link> ·{' '}
        <Link to="/login">{t('login')}</Link>
      </p>
    </section>
  );
}

export function ChangePasswordPage({ onChanged }: { onChanged: () => void }) {
  const t = useT();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      onChanged();
      navigate('/login');
    } catch (reason) {
      setError(authMessage(reason));
    } finally {
      setLoading(false);
    }
  }
  return (
    <section className="page narrow">
      <h1>{t('password')}</h1>
      <p>{t('passwordChangedHint')}</p>
      <form onSubmit={submit}>
        <label htmlFor="current-password">{t('currentPassword')}</label>
        <input
          id="current-password"
          type="password"
          autoComplete="current-password"
          required
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
        />
        <label htmlFor="new-password">{t('newPasswordLength')}</label>
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          minLength={15}
          maxLength={128}
          required
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
        />
        {error && <Notice message={error} error />}
        <button type="submit" disabled={loading}>
          {loading ? t('loading') : t('password')}
        </button>
      </form>
    </section>
  );
}
