import crypto from 'crypto';
import { supabaseAdmin } from './supabaseAdmin';

function hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
}

export async function createRefreshSession(
    userId: string,
    userAgent: string | null,
    ipAddress: string | null
): Promise<string> {
    const refreshToken = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supabaseAdmin.from('sessions').insert({
        user_id: userId,
        refresh_token_hash: hashToken(refreshToken),
        user_agent: userAgent,
        ip_address: ipAddress,
        expires_at: expiresAt,
    });

    if (error) throw new Error(error.message);
    return refreshToken;
}

export async function getValidSession(refreshToken: string) {
    const { data, error } = await supabaseAdmin
        .from('sessions')
        .select('*')
        .eq('refresh_token_hash', hashToken(refreshToken))
        .is('revoked_at', null)
        .gt('expires_at', new Date().toISOString())
        .single();

    if (error || !data) return null;
    return data;
}

export async function revokeSession(refreshToken: string): Promise<void> {
    await supabaseAdmin
        .from('sessions')
        .update({ revoked_at: new Date().toISOString() })
        .eq('refresh_token_hash', hashToken(refreshToken));
}

export async function rotateSession(
    oldRefreshToken: string,
    userId: string,
    userAgent: string | null,
    ipAddress: string | null
): Promise<string> {
    await revokeSession(oldRefreshToken);
    return createRefreshSession(userId, userAgent, ipAddress);
}