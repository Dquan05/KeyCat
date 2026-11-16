import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { apiMessage, apiRequest, type Account } from '../auth/auth-api';
import { useT } from '../Locale';

export type Settings = {
  uiLanguage: 'vi' | 'en';
  theme: 'light' | 'dark';
  typingFont: 'monospace' | 'sans-serif';
  fontSize: number;
  showKeyboard: boolean;
  showHands: boolean;
  soundEnabled: boolean;
};
export const defaultSettings: Settings = {
  uiLanguage: 'vi',
  theme: 'light',
  typingFont: 'monospace',
  fontSize: 24,
  showKeyboard: true,
  showHands: true,
  soundEnabled: false,
};
export function ProfilePage({
  account,
  settings,
  onSettings,
}: {
  account: Account;
  settings: Settings;
  onSettings: (value: Settings) => void;
}) {
  const t = useT();
  const [profile, setProfile] = useState<Account>(account);
  const [draft, setDraft] = useState<Settings>(settings);
  useEffect(() => {
    setDraft(settings);
  }, [settings]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  async function load() {
    setLoading(true);
    setError('');
    try {
      const [me, saved] = await Promise.all([
        apiRequest<Account>('/me'),
        apiRequest<Settings>('/me/settings'),
      ]);
      setProfile(me.data);
      setDraft(saved.data);
      onSettings(saved.data);
    } catch (cause) {
      setError(apiMessage(cause));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      setProfile(
        (
          await apiRequest<Account>('/me', {
            method: 'PATCH',
            body: {
              displayName: profile.displayName || '',
              timezone: profile.timezone || '',
            },
          })
        ).data,
      );
      setNotice(t('profileSaved'));
    } catch (cause) {
      setError(apiMessage(cause));
    } finally {
      setSaving(false);
    }
  }
  async function saveSettings(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    if (
      !Number.isInteger(draft.fontSize) ||
      draft.fontSize < 16 ||
      draft.fontSize > 36
    ) {
      setError(t('invalidFontSize'));
      setSaving(false);
      return;
    }
    try {
      const saved = (
        await apiRequest<Settings>('/me/settings', {
          method: 'PATCH',
          body: draft,
        })
      ).data;
      setDraft(saved);
      onSettings(saved);
      setNotice(t('settingsSaved'));
    } catch (cause) {
      setError(apiMessage(cause));
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="page narrow">
      <p className="eyebrow">Tài khoản</p>
      <h1>
        {t('profile')} · {t('settings')}
      </h1>
      {loading && <p role="status">{t('loadingProfile')}</p>}
      {error && (
        <p className="notice notice-error" role="alert">
          {error} <button onClick={() => void load()}>{t('retry')}</button>
        </p>
      )}
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      {!loading && (
        <>
          <p>
            {t('email')}: {profile.email} ·{' '}
            {profile.emailVerified ? t('verified') : t('unverified')}
          </p>
          <form onSubmit={saveProfile}>
            <h2>{t('profile')}</h2>
            <label htmlFor="display-name">{t('displayName')}</label>
            <input
              id="display-name"
              maxLength={160}
              value={profile.displayName || ''}
              onChange={(event) =>
                setProfile({ ...profile, displayName: event.target.value })
              }
            />
            <label htmlFor="timezone">{t('timezone')}</label>
            <input
              id="timezone"
              maxLength={80}
              value={profile.timezone || ''}
              onChange={(event) =>
                setProfile({ ...profile, timezone: event.target.value })
              }
            />
            <button disabled={saving}>{t('saveProfile')}</button>
          </form>
          <form onSubmit={saveSettings}>
            <h2>{t('settings')}</h2>
            <label htmlFor="language">{t('language')}</label>
            <select
              id="language"
              value={draft.uiLanguage}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  uiLanguage: event.target.value as Settings['uiLanguage'],
                })
              }
            >
              <option value="vi">Tiếng Việt</option>
              <option value="en">English</option>
            </select>
            <label htmlFor="theme">{t('theme')}</label>
            <select
              id="theme"
              value={draft.theme}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  theme: event.target.value as Settings['theme'],
                })
              }
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
            <label htmlFor="typing-font">{t('font')}</label>
            <select
              id="typing-font"
              value={draft.typingFont}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  typingFont: event.target.value as Settings['typingFont'],
                })
              }
            >
              <option value="monospace">Monospace</option>
              <option value="sans-serif">Sans-serif</option>
            </select>
            <label htmlFor="font-size">{t('fontSize')}</label>
            <input
              id="font-size"
              type="number"
              min={16}
              max={36}
              value={draft.fontSize}
              onChange={(event) =>
                setDraft({ ...draft, fontSize: Number(event.target.value) })
              }
            />
            <label>
              <input
                type="checkbox"
                checked={draft.showKeyboard}
                onChange={(event) =>
                  setDraft({ ...draft, showKeyboard: event.target.checked })
                }
              />{' '}
              {t('keyboard')}
            </label>
            <label>
              <input
                type="checkbox"
                checked={draft.showHands}
                onChange={(event) =>
                  setDraft({ ...draft, showHands: event.target.checked })
                }
              />{' '}
              {t('hands')}
            </label>
            <button disabled={saving}>{t('saveSettings')}</button>
          </form>
          <p>
            <Link to="/settings/password">{t('password')}</Link>
          </p>
        </>
      )}
    </section>
  );
}
