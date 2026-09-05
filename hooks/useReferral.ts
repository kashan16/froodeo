import { Referral } from '@/app/api/types';
import { apiFetch } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';

interface ReferralData {
    referral_code: string | null;
    referrals: Referral[];
}

export function useReferral() {
    return useQuery({
        queryKey: ['referrals', 'me'],
        queryFn: async () => {
        const res = await apiFetch('/api/referrals/me');
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || 'Failed to fetch referrals');
        return json.data as ReferralData;
        },
    });
}