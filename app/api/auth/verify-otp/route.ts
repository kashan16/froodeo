import { signAccessToken } from '@/lib/jwt';
import { verifyOtp } from '@/lib/msg91';
import { createRefreshSession } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    const { phone, otp } = (await request.json()) as { phone: string; otp: string };

    if (!phone || !otp) {
        return NextResponse.json({ error: 'phone and otp are required' }, { status: 400 });
    }

    if (!(await verifyOtp(phone, otp))) {
        return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 401 });
    }

    let { data: user } = await supabaseAdmin.from('users').select('*').eq('phone', phone).single();

    if (!user) {
        const referralCode = `${phone.slice(-6)}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
        const { data: inserted, error: insertError } = await supabaseAdmin
        .from('users')
        .insert({ phone, phone_verified: true, referral_code: referralCode })
        .select()
        .single();

        if (insertError || !inserted) {
        return NextResponse.json({ error: insertError?.message || 'Failed to create user' }, { status: 500 });
        }
        user = inserted;
    } else if (!user.phone_verified) {
        await supabaseAdmin.from('users').update({ phone_verified: true }).eq('id', user.id);
    }

    const accessToken = signAccessToken({ sub: user.id, phone: user.phone });
    const refreshToken = await createRefreshSession(
        user.id,
        request.headers.get('user-agent'),
        request.headers.get('x-forwarded-for')
    );

    const response = NextResponse.json({ accessToken, user });
    response.cookies.set('refresh_token', refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60,
    });
    return response;
}