import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// GET /api/products?category_id=&featured=&available=
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const categoryId = searchParams.get('category_id');
  const featured = searchParams.get('featured');
  const available = searchParams.get('available');

  let query = supabaseAdmin.from('products').select('*, categories(id, name)');

  if (categoryId) query = query.eq('category_id', categoryId);
  if (featured === 'true') query = query.eq('is_featured', true);
  if (available !== 'false') query = query.eq('is_available', true);

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data });
}

// POST /api/products
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { category_id, name, description, price, image_url, rating, is_available, is_featured } = body;

  if (!name || price === undefined) {
    return NextResponse.json({ error: 'name and price are required' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('products')
    .insert({ category_id, name, description, price, image_url, rating, is_available, is_featured })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data }, { status: 201 });
}