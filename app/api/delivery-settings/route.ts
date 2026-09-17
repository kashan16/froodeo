// app/api/delivery-settings/route.ts — public, read-only
import { getDeliverySettings } from '@/lib/deliverySettings';
import { NextResponse } from 'next/server';

export async function GET() {
  const settings = await getDeliverySettings();
  return NextResponse.json({ data: settings });
}