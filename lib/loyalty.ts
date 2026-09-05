import { supabaseAdmin } from './supabaseAdmin';

export async function awardLoyaltyPoints(orderId: string): Promise<void> {
    const { data: order } = await supabaseAdmin
        .from('orders')
        .select('id, user_id, points_earned')
        .eq('id', orderId)
        .single();

    if (!order || !order.user_id) return; // guest orders earn nothing
    if (order.points_earned > 0) return; // already awarded

    const { data: items } = await supabaseAdmin
        .from('order_items')
        .select('id, quantity, products(loyalty_points)')
        .eq('order_id', orderId);

    if (!items) return;

    let totalPoints = 0;
    const itemUpdates: { id: string; points: number }[] = [];
    for (const item of items) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const perUnit = (item.products as any)?.loyalty_points ?? 0;
        const earned = perUnit * item.quantity;
        totalPoints += earned;
        itemUpdates.push({ id: item.id, points: earned });
    }

    if (totalPoints === 0) return;

    // Atomic guard: only proceed if nobody else has claimed this order's
    // points yet (protects against the webhook and the /verify route racing
    // each other on the same order).
    const { data: claimed } = await supabaseAdmin
        .from('orders')
        .update({ points_earned: totalPoints })
        .eq('id', orderId)
        .eq('points_earned', 0)
        .select('id');

    if (!claimed || claimed.length === 0) return;

    await Promise.all(
        itemUpdates.map((u) => supabaseAdmin.from('order_items').update({ points_earned: u.points }).eq('id', u.id))
    );

    const { data: user } = await supabaseAdmin
        .from('users')
        .select('loyalty_points_balance')
        .eq('id', order.user_id)
        .single();

    const newBalance = (user?.loyalty_points_balance ?? 0) + totalPoints;
    await supabaseAdmin.from('users').update({ loyalty_points_balance: newBalance }).eq('id', order.user_id);

    await supabaseAdmin.from('loyalty_transactions').insert({
        user_id: order.user_id,
        order_id: orderId,
        type: 'earn',
        points: totalPoints,
        balance_after: newBalance,
        note: 'Order completed',
    });
}