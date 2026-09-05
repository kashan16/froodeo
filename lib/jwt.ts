import jwt from 'jsonwebtoken';

export interface UserTokenPayload {
    sub: string; // user id
    phone: string;
}

export interface AdminTokenPayload {
    sub: string; // admin id
    username: string;
    role: 'admin';
}

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!;
const ADMIN_SECRET = process.env.ADMIN_JWT_SECRET!;

export function signAccessToken(payload: UserTokenPayload): string {
    return jwt.sign(payload, ACCESS_SECRET, { expiresIn: '15m' });
}

export function verifyAccessToken(token: string): UserTokenPayload {
    return jwt.verify(token, ACCESS_SECRET) as UserTokenPayload;
}

export function signAdminToken(payload: AdminTokenPayload): string {
    return jwt.sign(payload, ADMIN_SECRET, { expiresIn: '12h' });
}

export function verifyAdminToken(token: string): AdminTokenPayload {
    return jwt.verify(token, ADMIN_SECRET) as AdminTokenPayload;
}