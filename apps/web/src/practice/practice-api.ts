import { apiRequest } from '../auth/auth-api';

export type Mode = 'LESSON' | 'SPEED_TIME' | 'SPEED_WORDS';
export type Result = {
  verified: boolean;
  eligibleForRanking: boolean;
  effectiveWpm: number | null;
  firstTryAccuracy: number | null;
  score: number | null;
  stars: number | null;
  passed: boolean | null;
  durationMs: number | null;
};
export type Attempt = {
  attemptId: string;
  targetId: string;
  mode: Mode;
  status: string;
  content: { kind: string; text: string };
  configSnapshot: { preset?: number; keyboardLayout: string };
  expiresAt: string;
};
export type AttemptRead = {
  attemptId: string;
  targetId: string;
  mode: Mode;
  status: string;
  result: Result | null;
  expiresAt: string;
};

export async function startAttempt(targetId: string, mode: Mode) {
  return (
    await apiRequest<Attempt>('/practice/attempts', {
      method: 'POST',
      body: { targetId, requestedMode: mode, deviceSupported: true },
    })
  ).data;
}
export async function getAttempt(id: string) {
  return (
    await apiRequest<AttemptRead>(
      `/practice/attempts/${encodeURIComponent(id)}`,
    )
  ).data;
}
export async function finishAttempt(id: string, body: unknown, key: string) {
  return (
    await apiRequest<AttemptRead>(
      `/practice/attempts/${encodeURIComponent(id)}/finish`,
      {
        method: 'POST',
        body,
        idempotencyKey: key,
      },
    )
  ).data;
}
export async function abandonAttempt(id: string, key: string) {
  return (
    await apiRequest<AttemptRead>(
      `/practice/attempts/${encodeURIComponent(id)}/abandon`,
      {
        method: 'POST',
        body: {},
        idempotencyKey: key,
      },
    )
  ).data;
}
