import assert from 'node:assert/strict';
import test from 'node:test';
import { Navigate, Outlet } from 'react-router';
import { RequireSession } from '../src/RequireSession.ts';

test('unauthenticated members and admins are sent to login', () => {
  for (const requireAdmin of [false, true]) {
    const element = RequireSession({ session: null, requireAdmin });
    assert.equal(element.type, Navigate);
    assert.equal(element.props.to, '/login');
    assert.equal(element.props.replace, true);
  }
});

test('authenticated member can access member shell but not admin shell', () => {
  assert.equal(RequireSession({ session: { role: 'MEMBER' } }).type, Outlet);
  const denied = RequireSession({
    session: { role: 'MEMBER' },
    requireAdmin: true,
  });
  assert.equal(denied.type, 'p');
  assert.equal(denied.props.role, 'alert');
});

test('admin can access admin shell', () => {
  assert.equal(
    RequireSession({ session: { role: 'ADMIN' }, requireAdmin: true }).type,
    Outlet,
  );
});
