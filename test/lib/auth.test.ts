import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { verifyAccessTokenMock, verifyAdminTokenMock } = vi.hoisted(() => ({
  verifyAccessTokenMock: vi.fn(),
  verifyAdminTokenMock: vi.fn(),
}));
vi.mock('@/lib/jwt', () => ({
  verifyAccessToken: verifyAccessTokenMock,
  verifyAdminToken: verifyAdminTokenMock,
}));

import { getAdminFromRequest, getUserFromRequest } from '@/lib/auth';

beforeEach(() => vi.clearAllMocks());

describe('getUserFromRequest', () => {
  it('returns null when there is no Authorization header', () => {
    const req = new NextRequest('http://localhost/api/x');
    expect(getUserFromRequest(req)).toBeNull();
    expect(verifyAccessTokenMock).not.toHaveBeenCalled();
  });

  it('strips "Bearer " and verifies the remaining token', () => {
    verifyAccessTokenMock.mockReturnValue({ sub: 'user-1', phone: '+919876543210' });
    const req = new NextRequest('http://localhost/api/x', {
      headers: { authorization: 'Bearer abc.def.ghi' },
    });

    const result = getUserFromRequest(req);

    expect(verifyAccessTokenMock).toHaveBeenCalledWith('abc.def.ghi');
    expect(result).toEqual({ sub: 'user-1', phone: '+919876543210' });
  });

  it('returns null when verification throws', () => {
    verifyAccessTokenMock.mockImplementation(() => {
      throw new Error('invalid');
    });
    const req = new NextRequest('http://localhost/api/x', {
      headers: { authorization: 'Bearer bad' },
    });

    expect(getUserFromRequest(req)).toBeNull();
  });
});

describe('getAdminFromRequest', () => {
  it('returns null when there is no admin_token cookie', () => {
    const req = new NextRequest('http://localhost/api/x');
    expect(getAdminFromRequest(req)).toBeNull();
    expect(verifyAdminTokenMock).not.toHaveBeenCalled();
  });

  it('verifies the admin_token cookie value', () => {
    verifyAdminTokenMock.mockReturnValue({ sub: 'admin-1', username: 'root', role: 'admin' });
    const req = new NextRequest('http://localhost/api/x', {
      headers: { cookie: 'admin_token=signed-value' },
    });

    const result = getAdminFromRequest(req);

    expect(verifyAdminTokenMock).toHaveBeenCalledWith('signed-value');
    expect(result).toEqual({ sub: 'admin-1', username: 'root', role: 'admin' });
  });

  it('returns null when verification throws (expired/tampered cookie)', () => {
    verifyAdminTokenMock.mockImplementation(() => {
      throw new Error('expired');
    });
    const req = new NextRequest('http://localhost/api/x', {
      headers: { cookie: 'admin_token=expired-value' },
    });

    expect(getAdminFromRequest(req)).toBeNull();
  });
});