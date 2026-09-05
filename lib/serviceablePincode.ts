import { supabaseAdmin } from './supabaseAdmin';

export async function isPincodeServiceable(pincode: string): Promise<{ serviceable: boolean; area_name: string | null }> {
    const { data } = await supabaseAdmin
        .from('serviceable_pincodes')
        .select('area_name')
        .eq('pincode', pincode.trim())
        .eq('is_active', true)
        .maybeSingle();

    return { serviceable: !!data, area_name: data?.area_name ?? null };
}