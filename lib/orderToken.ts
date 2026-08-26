import jwt from 'jsonwebtoken';

const SECRET = process.env.ORDER_TOKEN_SECRET;

if (!SECRET) {
    // Fail loud at boot, not silently at request time
    throw new Error('ORDER_TOKEN_SECRET is not set');
}

interface OrderTokenPayload {
    order_id: string;
    guest_id: string;
}

/**
 * Issue a signed token proving possession of a specific order.
 * Expires in 24h — long enough to complete checkout + retries,
 * short enough to limit exposure if a link/token leaks.
 */
export function signOrderToken(payload: OrderTokenPayload): string {
    return jwt.sign(payload, SECRET as string, { expiresIn: '24h' });
}

/**
 * Verify and decode an order token. Throws if invalid/expired.
 */
export function verifyOrderToken(token: string): OrderTokenPayload {
    return jwt.verify(token, SECRET as string) as OrderTokenPayload;
}

/**
 * Helper to pull + verify the token from a request's Authorization header.
 * Returns null if missing/invalid rather than throwing, so callers can
 * decide how to respond (401 vs 403 depending on context).
 */
export function getVerifiedOrderTokenFromRequest(
    request: Request
): OrderTokenPayload | null {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return null;

    const token = authHeader.slice('Bearer '.length);
    try {
        return verifyOrderToken(token);
    } catch {
        return null;
    }
}