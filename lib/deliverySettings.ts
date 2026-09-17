import { supabaseAdmin } from '@/lib/supabaseAdmin';

export interface DeliverySettings {
  is_delivery_free: boolean;
  delivery_charge: number;
  free_delivery_threshold: number;
  tax_percent: number;
  min_lead_days: number;
}

export async function getDeliverySettings(): Promise<DeliverySettings> {
  const { data } = await supabaseAdmin.from('delivery_settings').select('*').eq('id', 1).single();
  return (
    data ?? {
      is_delivery_free: false,
      delivery_charge: 40,
      free_delivery_threshold: 500,
      tax_percent: 5,
      min_lead_days: 1,
    }
  );
}

export function computeDeliveryCharge(subtotal: number, settings: DeliverySettings) {
  if (settings.is_delivery_free) return 0;
  if (subtotal >= settings.free_delivery_threshold) return 0;
  return settings.delivery_charge;
}

export function computeTax(taxableAmount: number, settings: DeliverySettings) {
  return Math.round(taxableAmount * (settings.tax_percent / 100) * 100) / 100;
}

// Earliest deliverable date given the pre-booking lead time, in IST.
export function getEarliestDeliveryDate(settings: DeliverySettings): string {
  const now = new Date();
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffsetMs);
  istNow.setUTCDate(istNow.getUTCDate() + settings.min_lead_days);
  return istNow.toISOString().slice(0, 10); // YYYY-MM-DD
}