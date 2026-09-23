// hooks/useDeliverySettings.ts — public hook
import { useQuery } from '@tanstack/react-query';

export interface PublicDeliverySettings {
  is_delivery_free: boolean;
  delivery_charge: number;
  free_delivery_threshold: number;
  tax_percent: number;
  min_lead_days: number;
}

export function usePublicDeliverySettings() {
  return useQuery({
    queryKey: ['public-delivery-settings'],
    queryFn: async () => {
      const res = await fetch('/api/delivery-settings');
      const json = await res.json();
      return json.data as PublicDeliverySettings;
    },
    staleTime: 60_000,
  });
}