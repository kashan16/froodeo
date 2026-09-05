const MSG91_BASE = 'https://control.msg91.com/api/v5/otp';

function normalizePhone(phone: string): string {
    return phone.replace(/^\+/, '');
}

export async function sendOtp(phone: string): Promise<void> {
    const mobile = normalizePhone(phone);
    const url = `${MSG91_BASE}?template_id=${process.env.MSG91_TEMPLATE_ID}&mobile=${mobile}&otp_length=6&otp_expiry=5`;

    const res = await fetch(url, {
        method: 'POST',
        headers: { authkey: process.env.MSG91_AUTH_KEY!, 'Content-Type': 'application/json' },
    });

    const data = await res.json();
    if (data.type !== 'success') {
        throw new Error(data.message || 'Failed to send OTP');
    }
}

export async function verifyOtp(phone: string, otp: string): Promise<boolean> {
    const mobile = normalizePhone(phone);
    const url = `${MSG91_BASE}/verify?mobile=${mobile}&otp=${otp}`;

    const res = await fetch(url, { headers: { authkey: process.env.MSG91_AUTH_KEY! } });
    const data = await res.json();
    return data.type === 'success';
}

export async function resendOtp(phone: string, viaVoice = false): Promise<void> {
    const mobile = normalizePhone(phone);
    const url = `${MSG91_BASE}/retry?mobile=${mobile}&retrytype=${viaVoice ? 'voice' : 'text'}`;

    const res = await fetch(url, { headers: { authkey: process.env.MSG91_AUTH_KEY! } });
    const data = await res.json();
    if (data.type !== 'success') {
        throw new Error(data.message || 'Failed to resend OTP');
    }
}