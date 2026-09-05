import { NextRequest } from 'next/server';
import { getUserFromRequest } from './auth';
import { getVerifiedOrderTokenFromRequest } from './orderToken';
import { supabaseAdmin } from './supabaseAdmin';

// True if the caller may read/modify this order — either via the guest
// order token minted at checkout, or as the logged-in user who owns it.
export async function canAccessOrder(request: NextRequest, orderId: string): Promise<boolean> {
    const orderToken = getVerifiedOrderTokenFromRequest(request);
    if (orderToken && orderToken.order_id === orderId) return true;

    const user = getUserFromRequest(request);
    if (!user) return false;

    const { data: order } = await supabaseAdmin.from('orders').select('user_id').eq('id', orderId).single();
    return !!order && order.user_id === user.sub;
}