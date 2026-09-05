import { supabaseAdmin } from './supabaseAdmin';

export async function recalculateOrderTotals(orderId: string): Promise<void> {
    const { data: items } = await supabaseAdmin.from('order_items').select('total_price').eq('order_id', orderId);
    const subtotal = (items || []).reduce((sum, i) => sum + Number(i.total_price), 0);

    const { data: order } = await supabaseAdmin
        .from('orders')
        .select('delivery_charge, discount, coupon_discount, points_discount')
        .eq('id', orderId)
        .single();

    if (!order) return;

    const total =
        subtotal +
        Number(order.delivery_charge) -
        Number(order.discount) -
        Number(order.coupon_discount) -
        Number(order.points_discount);

    await supabaseAdmin.from('orders').update({ subtotal, total }).eq('id', orderId);
}