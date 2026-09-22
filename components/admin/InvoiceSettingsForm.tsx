'use client';

import { useInvoiceSettings, useUpdateInvoiceSettings } from '@/hooks/admin/useInvoiceSettings';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

const FIELD_GROUPS = [
  {
    title: 'Business Details',
    fields: [
      { key: 'business_name', label: 'Business name', type: 'text' },
      { key: 'business_address', label: 'Business address', type: 'textarea' },
      { key: 'gstin', label: 'GSTIN', type: 'text' },
      { key: 'pan', label: 'PAN', type: 'text' },
      { key: 'fssai_license', label: 'FSSAI license number', type: 'text' },
    ],
  },
  {
    title: 'Contact',
    fields: [
      { key: 'support_email', label: 'Support email', type: 'text' },
      { key: 'support_phone', label: 'Support phone', type: 'text' },
    ],
  },
  {
    title: 'Bank Details (shown on invoice)',
    fields: [
      { key: 'bank_account_name', label: 'Account holder name', type: 'text' },
      { key: 'bank_account_number', label: 'Account number', type: 'text' },
      { key: 'bank_ifsc', label: 'IFSC code', type: 'text' },
      { key: 'bank_name', label: 'Bank name', type: 'text' },
    ],
  },
  {
    title: 'Numbering',
    fields: [
      { key: 'invoice_prefix', label: 'Invoice number prefix', type: 'text' },
    ],
  },
] as const;

type FormState = Record<string, string>;

export function InvoiceSettingsForm() {
  const { data, isLoading } = useInvoiceSettings();
  const update = useUpdateInvoiceSettings();
  const [form, setForm] = useState<FormState>({});

  useEffect(() => {
    if (data) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm({
        business_name: data.business_name ?? '',
        business_address: data.business_address ?? '',
        gstin: data.gstin ?? '',
        pan: data.pan ?? '',
        fssai_license: data.fssai_license ?? '',
        support_email: data.support_email ?? '',
        support_phone: data.support_phone ?? '',
        bank_account_name: data.bank_account_name ?? '',
        bank_account_number: data.bank_account_number ?? '',
        bank_ifsc: data.bank_ifsc ?? '',
        bank_name: data.bank_name ?? '',
        invoice_prefix: data.invoice_prefix ?? 'INV',
      });
    }
  }, [data]);

  if (isLoading) {
    return <div className="text-zinc-500">Loading...</div>;
  }

  const handleSave = () => update.mutate(form);

  return (
    <div className="max-w-lg space-y-8">
      {FIELD_GROUPS.map((group) => (
        <div key={group.title} className="space-y-3">
          <h3 className="text-sm font-medium text-zinc-300">{group.title}</h3>
          {group.fields.map((field) => (
            <div key={field.key}>
              <label className="text-sm text-zinc-400">{field.label}</label>
              {field.type === 'textarea' ? (
                <textarea
                  value={form[field.key] ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                  rows={3}
                  className="w-full mt-1 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                />
              ) : (
                <input
                  type="text"
                  value={form[field.key] ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                  className="w-full mt-1 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                />
              )}
            </div>
          ))}
        </div>
      ))}

      <p className="text-xs text-zinc-600">
        Next invoice number will start at{' '}
        <span className="text-zinc-400 font-mono">
          {form.invoice_prefix || 'INV'}-{String(data?.next_invoice_seq ?? 1).padStart(5, '0')}
        </span>
      </p>

      {update.isError && <p className="text-sm text-red-400">{(update.error as Error).message}</p>}

      <button
        onClick={handleSave}
        disabled={update.isPending}
        className="flex items-center gap-2 rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-white disabled:opacity-50"
      >
        {update.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        Save Invoice Settings
      </button>
    </div>
  );
}