import { supabaseAdmin } from './supabaseAdmin';

const MAX_REQUESTS_PER_WINDOW = 3;
const WINDOW_MINUTES = 10;

export async function checkOtpRateLimit(phone: string): Promise<void> {
    const since = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();

    const { count, error } = await supabaseAdmin
        .from('otp_requests')
        .select('*', { count: 'exact', head: true })
        .eq('phone', phone)
        .gte('created_at', since);

    if (error) throw new Error(error.message);
    if ((count ?? 0) >= MAX_REQUESTS_PER_WINDOW) {
        throw new Error('Too many OTP requests. Please try again in a few minutes.');
    }
}

export async function logOtpRequest(
    phone: string,
    purpose: 'login' | 'phone_verify',
    ipAddress: string | null
): Promise<void> {
    await supabaseAdmin.from('otp_requests').insert({ phone, purpose, ip_address: ipAddress });
}