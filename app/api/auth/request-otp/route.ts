import { sendOtp } from '@/lib/msg91';
import { checkOtpRateLimit, logOtpRequest } from '@/lib/rateLimit';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    const { phone } = (await request.json()) as { phone: string };

    if (!phone || !/^\+91[6-9]\d{9}$/.test(phone)) {
        return NextResponse.json({ error: 'Invalid Indian phone number' }, { status: 400 });
    }

    try {
        await checkOtpRateLimit(phone);
        await sendOtp(phone);
        await logOtpRequest(phone, 'login', request.headers.get('x-forwarded-for'));
        return NextResponse.json({ success: true });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 429 });
    }
}