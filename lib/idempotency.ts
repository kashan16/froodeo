import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * Look up an existing, still-usable payment attempt for this order.
 * Replaces the old in-memory Map, which does not work across
 * serverless invocations/instances — this is backed by the `payments`
 * table itself, so it's correct regardless of how many instances
 * are running.
 *
 * "Still usable" = not 'failed'. A 'created' or 'captured' payment
 * means we should NOT create a new Razorpay order — either the
 * attempt is still in flight, or it already succeeded.
 */
export async function getExistingPayment(orderId: string) {
  const { data, error } = await supabaseAdmin
    .from('payments')
    .select('*')
    .eq('order_id', orderId)
    .neq('status', 'failed')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Failed to check existing payment:', error);
    return null;
  }

  return data;
}