import { isPincodeServiceable } from '@/lib/serviceablePincode';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const pincode = request.nextUrl.searchParams.get('pincode')?.trim() ?? '';

  if (!/^\d{6}$/.test(pincode)) {
    return NextResponse.json({ error: 'Enter a valid 6-digit pincode' }, { status: 400 });
  }

  const result = await isPincodeServiceable(pincode);
  return NextResponse.json({ data: result });
}