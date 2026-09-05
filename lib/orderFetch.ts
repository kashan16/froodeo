import { apiFetch, hasAccessToken } from '@/context/AuthContext';

export async function orderScopedFetch(
    orderId: string,
    url: string,
    options: RequestInit = {}
): Promise<Response> {
    if (hasAccessToken()) {
        return apiFetch(url, options);
    }

    const token = typeof window !== 'undefined' ? sessionStorage.getItem(`order_token_${orderId}`) : null;
    return fetch(url, {
        ...options,
        headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
        },
    });
}