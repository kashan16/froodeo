import crypto from 'crypto';

/**
 * Generate idempotency key from order and payment intent
 * Ensures duplicate requests are handled gracefully
 */
export function generateIdempotencyKey(orderId: string, userId: string): string {
  return crypto
    .createHash('sha256')
    .update(`${orderId}-${userId}-payment`)
    .digest('hex');
}

/**
 * Store idempotency key with response to prevent duplicate processing
 * You can use Redis, database, or in-memory store
 */
export const idempotencyStore = new Map<
  string,
  { response: any; timestamp: number }
>();

export function getIdempotencyResponse(key: string) {
  const stored = idempotencyStore.get(key);

  if (!stored) return null;

  // Check if response is older than 24 hours
  if (Date.now() - stored.timestamp > 24 * 60 * 60 * 1000) {
    idempotencyStore.delete(key);
    return null;
  }

  return stored.response;
}

export function setIdempotencyResponse(key: string, response: any) {
  idempotencyStore.set(key, {
    response,
    timestamp: Date.now(),
  });
}