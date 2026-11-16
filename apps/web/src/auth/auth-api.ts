export type Account = {
  id: string;
  email: string;
  username: string;
  role: 'MEMBER' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED' | 'DELETED';
  emailVerified: boolean;
  displayName?: string | null;
  timezone?: string | null;
};

type Envelope<T> = { data: T; meta: { requestId: string } };
type ErrorEnvelope = { error?: { code?: string; message?: string } };

let accessToken: string | null = null;
let restorePending: Promise<Account | null> | null = null;

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(
  path: string,
  method: 'GET' | 'POST',
  body?: unknown,
  authorized = false,
): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (authorized && accessToken)
    headers.Authorization = `Bearer ${accessToken}`;
  const response = await fetch(`/api/v1${path}`, {
    method,
    credentials: 'same-origin',
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const payload = (await response.json()) as Envelope<T> & ErrorEnvelope;
  if (!response.ok)
    throw new ApiError(
      payload.error?.code || 'REQUEST_FAILED',
      payload.error?.message || 'Request failed',
    );
  return payload.data;
}

export async function register(
  email: string,
  username: string,
  password: string,
) {
  return request<{ verificationRequired: boolean }>('/auth/register', 'POST', {
    email,
    username,
    password,
  });
}

export async function verifyEmail(token: string) {
  return request<{ verifiedAt: string }>('/auth/verify-email', 'POST', {
    token,
  });
}

export async function resendVerification(email: string) {
  return request<{ accepted: boolean }>('/auth/resend-verification', 'POST', {
    email,
  });
}

export async function login(email: string, password: string): Promise<Account> {
  const result = await request<{ accessToken: string; user: Account }>(
    '/auth/login',
    'POST',
    { email, password },
  );
  accessToken = result.accessToken;
  return result.user;
}

export function restoreSession(): Promise<Account | null> {
  if (!restorePending) {
    restorePending = (async () => {
      try {
        const result = await request<{ accessToken: string; user: Account }>(
          '/auth/refresh',
          'POST',
        );
        accessToken = result.accessToken;
        return result.user;
      } catch {
        accessToken = null;
        return null;
      } finally {
        restorePending = null;
      }
    })();
  }
  return restorePending;
}

export async function logout(): Promise<void> {
  await request('/auth/logout', 'POST');
  accessToken = null;
}

export async function forgotPassword(email: string) {
  return request<{ accepted: boolean }>('/auth/forgot-password', 'POST', {
    email,
  });
}

export async function resetPassword(token: string, newPassword: string) {
  return request<{ reset: boolean }>('/auth/reset-password', 'POST', {
    token,
    newPassword,
  });
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
) {
  const result = await request<{ changed: boolean }>(
    '/me/password',
    'POST',
    { currentPassword, newPassword },
    true,
  );
  accessToken = null;
  return result;
}

export function authMessage(error: unknown): string {
  if (
    typeof document !== 'undefined' &&
    document.documentElement.lang === 'en'
  ) {
    if (!(error instanceof ApiError))
      return 'Could not connect to the server. Please retry.';
    const english: Record<string, string> = {
      EMAIL_EXISTS: 'This email or username is already in use.',
      AUTH_INVALID: 'Invalid credentials or session.',
      TOKEN_INVALID: 'This link is invalid or expired.',
      RATE_LIMITED: 'Too many attempts. Please try later.',
      ACCOUNT_SUSPENDED: 'This account is suspended.',
      SERVICE_UNAVAILABLE: 'The service is temporarily unavailable.',
      VALIDATION_ERROR: 'The information entered is invalid.',
    };
    return (
      english[error.code] || `Request failed (${error.code}). Please retry.`
    );
  }
  if (!(error instanceof ApiError))
    return 'Không thể kết nối máy chủ. Vui lòng thử lại.';
  const messages: Record<string, string> = {
    EMAIL_EXISTS: 'Email hoặc tên đăng nhập đã tồn tại.',
    AUTH_INVALID: 'Thông tin đăng nhập hoặc phiên không hợp lệ.',
    TOKEN_INVALID: 'Liên kết không hợp lệ hoặc đã hết hạn.',
    RATE_LIMITED: 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau.',
    ACCOUNT_SUSPENDED: 'Tài khoản đã bị tạm khóa.',
    SERVICE_UNAVAILABLE: 'Dịch vụ đang tạm gián đoạn. Vui lòng thử lại.',
    VALIDATION_ERROR: 'Thông tin nhập chưa hợp lệ. Mật khẩu cần 15–128 ký tự.',
  };
  return (
    messages[error.code] || 'Yêu cầu chưa thực hiện được. Vui lòng thử lại.'
  );
}

export type PageData<T> = {
  data: T;
  meta: { requestId: string; hasMore?: boolean; nextCursor?: string | null };
};

export async function apiRequest<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PATCH';
    body?: unknown;
    idempotencyKey?: string;
  } = {},
): Promise<PageData<T>> {
  if (!accessToken) await restoreSession();
  const send = () =>
    fetch(`/api/v1${path}`, {
      method: options.method ?? 'GET',
      credentials: 'same-origin',
      headers: {
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(options.body !== undefined
          ? { 'Content-Type': 'application/json' }
          : {}),
        ...(options.idempotencyKey
          ? { 'Idempotency-Key': options.idempotencyKey }
          : {}),
      },
      ...(options.body !== undefined
        ? { body: JSON.stringify(options.body) }
        : {}),
    });
  let response = await send();
  if (response.status === 401 && (await restoreSession()))
    response = await send();
  let payload: PageData<T> & ErrorEnvelope;
  try {
    payload = (await response.json()) as PageData<T> & ErrorEnvelope;
  } catch {
    throw new ApiError('REQUEST_FAILED', 'Invalid server response');
  }
  if (!response.ok)
    throw new ApiError(
      payload.error?.code || 'REQUEST_FAILED',
      payload.error?.message || 'Request failed',
    );
  return payload;
}

export function apiMessage(error: unknown): string {
  if (
    typeof document !== 'undefined' &&
    document.documentElement.lang === 'en'
  ) {
    if (!(error instanceof ApiError))
      return 'Connection lost. Check your network and retry.';
    const english: Record<string, string> = {
      EMAIL_NOT_VERIFIED: 'Verify your email before starting.',
      UNSUPPORTED_DEVICE: 'A desktop keyboard is required for scored practice.',
      ATTEMPT_EXPIRED: 'This attempt has expired. Start a new one.',
      CONTENT_UNPUBLISHED: 'This content is unavailable.',
      NOT_FOUND: 'Content not found.',
      INVALID_EVENT_LOG: 'Typing data is invalid. Start again.',
      EVENT_LOG_TOO_LARGE: 'Typing data exceeded the limit. Start again.',
      VALIDATION_ERROR: 'The information entered is invalid.',
    };
    return (
      english[error.code] || `Request failed (${error.code}). Please retry.`
    );
  }
  if (!(error instanceof ApiError))
    return 'Mất kết nối. Kiểm tra mạng rồi thử lại.';
  const messages: Record<string, string> = {
    EMAIL_NOT_VERIFIED: 'Hãy xác minh email trước khi bắt đầu.',
    UNSUPPORTED_DEVICE:
      'Cần máy tính có bàn phím vật lý US QWERTY để luyện gõ.',
    ATTEMPT_EXPIRED: 'Phiên đã hết hạn. Hãy bắt đầu phiên mới.',
    CONTENT_UNPUBLISHED: 'Nội dung này hiện không khả dụng.',
    NOT_FOUND: 'Không tìm thấy nội dung.',
    INVALID_EVENT_LOG: 'Dữ liệu gõ không hợp lệ. Hãy bắt đầu lại.',
    EVENT_LOG_TOO_LARGE: 'Phiên gõ vượt giới hạn dữ liệu. Hãy bắt đầu lại.',
    VALIDATION_ERROR: 'Dữ liệu nhập không hợp lệ.',
  };
  return (
    messages[error.code] ||
    `Yêu cầu thất bại (${error.code}). Vui lòng thử lại.`
  );
}
