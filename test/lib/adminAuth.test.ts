import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getAdminFromRequestMock } = vi.hoisted(() => ({
  getAdminFromRequestMock: vi.fn(),
}));
vi.mock('@/lib/auth', () => ({ getAdminFromRequest: getAdminFromRequestMock }));

import { requireAdmin } from '@/lib/adminAuth';

beforeEach(() => vi.clearAllMocks());

describe('requireAdmin', () => {
  it('returns a 401 NextResponse when there is no admin', async () => {
    getAdminFromRequestMock.mockReturnValue(null);
    const req = new NextRequest('http://localhost/api/admin/x');

    const result = requireAdmin(req);

    expect(result).toBeInstanceOf(NextResponse);
    const body = await (result as NextResponse).json();
    expect((result as NextResponse).status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns the admin payload when authenticated', () => {
    const admin = { sub: 'admin-1', username: 'root', role: 'admin' as const };
    getAdminFromRequestMock.mockReturnValue(admin);
    const req = new NextRequest('http://localhost/api/admin/x');

    const result = requireAdmin(req);

    expect(result).toEqual(admin);
  });
});