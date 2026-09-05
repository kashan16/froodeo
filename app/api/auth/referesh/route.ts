import { signAccessToken } from '@/lib/jwt';
import { getValidSession, rotateSession } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    const refreshToken = request.cookies.get('refresh_token')?.value;
    if (!refreshToken) {
        return NextResponse.json({ error: 'No refresh token' }, { status: 401 });
    }

    const session = await getValidSession(refreshToken);
    if (!session) {
        return NextResponse.json({ error: 'Session expired, please log in again' }, { status: 401 });
    }

    const { data: user } = await supabaseAdmin.from('users').select('*').eq('id', session.user_id).single();
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const newRefreshToken = await rotateSession(
        refreshToken,
        user.id,
        request.headers.get('user-agent'),
        request.headers.get('x-forwarded-for')
    );
    const accessToken = signAccessToken({ sub: user.id, phone: user.phone });

    const response = NextResponse.json({ accessToken, user });
    response.cookies.set('refresh_token', newRefreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60,
    });
    return response;
}