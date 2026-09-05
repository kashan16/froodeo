import { revokeSession } from '@/lib/session';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    const refreshToken = request.cookies.get('refresh_token')?.value;
    if (refreshToken) await revokeSession(refreshToken);

    const response = NextResponse.json({ success: true });
    response.cookies.set('refresh_token', '', { path: '/', maxAge: 0 });
    return response;
}