import { createElement } from 'react';
import { Navigate, Outlet } from 'react-router';

export type Session = { role: 'MEMBER' | 'ADMIN' };

export function RequireSession({
  session,
  requireAdmin = false,
}: {
  session: Session | null;
  requireAdmin?: boolean;
}) {
  if (!session) return createElement(Navigate, { to: '/login', replace: true });
  if (requireAdmin && session.role !== 'ADMIN')
    return createElement(
      'p',
      { role: 'alert' },
      'Bạn không có quyền truy cập.',
    );
  return createElement(Outlet);
}
