import { requireAdmin } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const { data, error } = await supabaseAdmin.from('delivery_settings').select('*').eq('id', 1).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function PUT(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const { is_delivery_free, delivery_charge, free_delivery_threshold, tax_percent, min_lead_days } =
    await request.json();

  const update: Record<string, number | boolean> = {};
  if (is_delivery_free !== undefined) update.is_delivery_free = !!is_delivery_free;
  if (delivery_charge !== undefined) {
    if (typeof delivery_charge !== 'number' || delivery_charge < 0)
      return NextResponse.json({ error: 'delivery_charge must be a non-negative number' }, { status: 400 });
    update.delivery_charge = delivery_charge;
  }
  if (free_delivery_threshold !== undefined) {
    if (typeof free_delivery_threshold !== 'number' || free_delivery_threshold < 0)
      return NextResponse.json({ error: 'free_delivery_threshold must be non-negative' }, { status: 400 });
    update.free_delivery_threshold = free_delivery_threshold;
  }
  if (tax_percent !== undefined) {
    if (typeof tax_percent !== 'number' || tax_percent < 0 || tax_percent > 100)
      return NextResponse.json({ error: 'tax_percent must be between 0 and 100' }, { status: 400 });
    update.tax_percent = tax_percent;
  }
  if (min_lead_days !== undefined) {
    if (!Number.isInteger(min_lead_days) || min_lead_days < 0)
      return NextResponse.json({ error: 'min_lead_days must be a non-negative integer' }, { status: 400 });
    update.min_lead_days = min_lead_days;
  }

  const { data, error } = await supabaseAdmin
    .from('delivery_settings')
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq('id', 1)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}