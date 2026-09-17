import { adminFetch } from '@/lib/adminApi';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface DeliverySettings {
  is_delivery_free: boolean;
  delivery_charge: number;
  free_delivery_threshold: number;
  tax_percent: number;
  min_lead_days: number;
}

export function useDeliverySettings() {
  return useQuery({
    queryKey: ['delivery-settings'],
    queryFn: () => adminFetch<{ data: DeliverySettings }>('/api/admin/delivery-settings').then((r) => r.data),
  });
}

export function useUpdateDeliverySettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<DeliverySettings>) =>
      adminFetch<{ data: DeliverySettings }>('/api/admin/delivery-settings', {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['delivery-settings'] }),
  });
}