import { User } from '@/app/api/types';
import { apiFetch } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';

export function useMe() {
    return useQuery({
        queryKey: ['me'],
        queryFn: async () => {
        const res = await apiFetch('/api/auth/me');
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || 'Failed to fetch profile');
        return json.data as User;
        },
        retry: false,
    });
}