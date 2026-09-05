import { getUserFromRequest } from '@/lib/auth';
import { validateCoupon } from '@/lib/coupon';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { code, subtotal } = await request.json();

  if (!code?.trim() || typeof subtotal !== 'number') {
    return NextResponse.json({ error: 'code and subtotal are required' }, { status: 400 });
  }

  const user = getUserFromRequest(request);
  const result = await validateCoupon(code, subtotal, user?.sub ?? null);

  if (!result.valid) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ data: result });
}