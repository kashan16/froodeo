import {
    signAccessToken,
    signAdminToken,
    verifyAccessToken,
    verifyAdminToken,
} from '@/lib/jwt';
import { describe, expect, it } from 'vitest';

describe('user access tokens', () => {
  it('round-trips a valid payload', () => {
    const token = signAccessToken({ sub: 'user-1', phone: '+919876543210' });
    const decoded = verifyAccessToken(token);

    expect(decoded.sub).toBe('user-1');
    expect(decoded.phone).toBe('+919876543210');
  });

  it('throws on a tampered token', () => {
    const token = signAccessToken({ sub: 'user-1', phone: '+919876543210' });
    const tampered = token.slice(0, -2) + 'xx';

    expect(() => verifyAccessToken(tampered)).toThrow();
  });

  it('throws on garbage input', () => {
    expect(() => verifyAccessToken('not-a-jwt')).toThrow();
  });
});

describe('admin tokens', () => {
  it('round-trips a valid admin payload', () => {
    const token = signAdminToken({ sub: 'admin-1', username: 'root', role: 'admin' });
    const decoded = verifyAdminToken(token);

    expect(decoded).toMatchObject({ sub: 'admin-1', username: 'root', role: 'admin' });
  });

  it('an admin token does not verify as a user access token and vice versa', () => {
    const adminToken = signAdminToken({ sub: 'admin-1', username: 'root', role: 'admin' });
    const userToken = signAccessToken({ sub: 'user-1', phone: '+919876543210' });

    // signed with different secrets — cross-verification must fail
    expect(() => verifyAccessToken(adminToken)).toThrow();
    expect(() => verifyAdminToken(userToken)).toThrow();
  });
});