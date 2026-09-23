import {
    getVerifiedOrderTokenFromRequest,
    signOrderToken,
    verifyOrderToken,
} from '@/lib/orderToken';
import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

describe('order tokens', () => {
  it('round-trips order_id and guest_id', () => {
    const token = signOrderToken({ order_id: 'order-1', guest_id: 'guest-1' });
    const decoded = verifyOrderToken(token);

    expect(decoded).toMatchObject({ order_id: 'order-1', guest_id: 'guest-1' });
  });

  it('throws on an invalid token', () => {
    expect(() => verifyOrderToken('garbage')).toThrow();
  });
});

describe('getVerifiedOrderTokenFromRequest', () => {
  it('returns null when there is no Authorization header', () => {
    const req = new NextRequest('http://localhost/api/orders/1');
    expect(getVerifiedOrderTokenFromRequest(req)).toBeNull();
  });

  it('returns null when the header is not a Bearer token', () => {
    const req = new NextRequest('http://localhost/api/orders/1', {
      headers: { authorization: 'Basic abc123' },
    });
    expect(getVerifiedOrderTokenFromRequest(req)).toBeNull();
  });

  it('returns null for an invalid Bearer token instead of throwing', () => {
    const req = new NextRequest('http://localhost/api/orders/1', {
      headers: { authorization: 'Bearer not-a-real-token' },
    });
    expect(getVerifiedOrderTokenFromRequest(req)).toBeNull();
  });

  it('returns the decoded payload for a valid Bearer token', () => {
    const token = signOrderToken({ order_id: 'order-1', guest_id: 'guest-1' });
    const req = new NextRequest('http://localhost/api/orders/1', {
      headers: { authorization: `Bearer ${token}` },
    });

    expect(getVerifiedOrderTokenFromRequest(req)).toMatchObject({
      order_id: 'order-1',
      guest_id: 'guest-1',
    });
  });
});