'use client';

import { DeliverySettingsForm } from '@/components/admin/DeliverySettingsForm';
import { InvoiceSettingsForm } from '@/components/admin/InvoiceSettingsForm';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const TABS = [
  { key: 'delivery', label: 'Delivery & Tax' },
  { key: 'invoice', label: 'Invoice' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function AdminSettingsPage() {
  const [tab, setTab] = useState<TabKey>('delivery');

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold text-zinc-100 mb-4">Settings</h1>

      <div className="flex gap-1 border-b border-zinc-800 mb-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === t.key
                ? 'border-zinc-100 text-zinc-100'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'delivery' && <DeliverySettingsForm />}
      {tab === 'invoice' && <InvoiceSettingsForm />}
    </div>
  );
}