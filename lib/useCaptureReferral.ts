// lib/useCaptureReferral.ts (new)
'use client';
import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

const REFERRAL_STORAGE_KEY = 'froodeo_referral_code';

export function useCaptureReferral() {
  const searchParams = useSearchParams();
  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) localStorage.setItem(REFERRAL_STORAGE_KEY, ref.trim());
  }, [searchParams]);
}

export function getStoredReferralCode(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFERRAL_STORAGE_KEY);
}