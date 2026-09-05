// components/ReferralWidget.tsx (new)
'use client';
import { useMe } from '@/hooks/useMe';
import { useReferral } from '@/hooks/useReferral';

export function ReferralWidget() {
  const { data: user } = useMe();
  const { data: referral, isLoading } = useReferral();

  if (!user || isLoading || !referral?.referral_code) return null;

  const link = `${window.location.origin}?ref=${referral.referral_code}`;

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-sm">
      <p className="font-medium text-black mb-1">Invite friends, earn points</p>
      <p className="text-black/60 mb-3">Share your code — you both get rewarded on their first order.</p>
      <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2">
        <span className="font-mono font-semibold">{referral.referral_code}</span>
        <button
          onClick={() => navigator.clipboard.writeText(link)}
          className="text-orange-500 text-xs font-medium"
        >
          Copy Link
        </button>
      </div>
    </div>
  );
}