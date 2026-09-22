import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface InvoiceSettings {
  id: number;
  business_name: string;
  business_address: string;
  gstin: string | null;
  pan: string | null;
  fssai_license: string | null;
  support_email: string | null;
  support_phone: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  bank_ifsc: string | null;
  bank_name: string | null;
  invoice_prefix: string;
  next_invoice_seq: number;
  logo_url: string | null;
}

export function useInvoiceSettings() {
  return useQuery({
    queryKey: ['admin', 'invoice-settings'],
    queryFn: async () => {
      const { data, error } = await supabaseAdmin.from('invoice_settings').select('*').eq('id', 1).single();
      if (error) throw error;
      return data as InvoiceSettings;
    },
  });
}

export function useUpdateInvoiceSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: Partial<InvoiceSettings>) => {
      const { data, error } = await supabaseAdmin
        .from('invoice_settings')
        .update(updates)
        .eq('id', 1)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'invoice-settings'] }),
  });
}