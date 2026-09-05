import { getUserFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const tokenPayload = getUserFromRequest(request);
    if (!tokenPayload) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: user, error } = await supabaseAdmin.from('users').select('*').eq('id', tokenPayload.sub).single();
    if (error || !user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({ data: user });
}