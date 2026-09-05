import { NextRequest } from 'next/server';
import { AdminTokenPayload, UserTokenPayload, verifyAccessToken, verifyAdminToken } from './jwt';

export function getUserFromRequest(request: NextRequest): UserTokenPayload | null {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) return null;
    try {
        return verifyAccessToken(token);
    } catch {
        return null;
    }
}

export function getAdminFromRequest(request: NextRequest): AdminTokenPayload | null {
    const token = request.cookies.get('admin_token')?.value;
    if (!token) return null;
    try {
        return verifyAdminToken(token);
    } catch {
        return null;
    }
}