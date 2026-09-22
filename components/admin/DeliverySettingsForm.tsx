'use client';

import { useDeliverySettings, useUpdateDeliverySettings } from '@/hooks/admin/useDeliverySettings';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export function DeliverySettingsForm() {
  const { data, isLoading } = useDeliverySettings();
  const update = useUpdateDeliverySettings();

  const [isFree, setIsFree] = useState(false);
  const [charge, setCharge] = useState(40);
  const [threshold, setThreshold] = useState(500);
  const [taxPercent, setTaxPercent] = useState(5);
  const [leadDays, setLeadDays] = useState(1);

  useEffect(() => {
    if (data) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsFree(data.is_delivery_free);
      setCharge(data.delivery_charge);
      setThreshold(data.free_delivery_threshold);
      setTaxPercent(data.tax_percent);
      setLeadDays(data.min_lead_days);
    }
  }, [data]);

  const handleSave = () => {
    update.mutate({
      is_delivery_free: isFree,
      delivery_charge: charge,
      free_delivery_threshold: threshold,
      tax_percent: taxPercent,
      min_lead_days: leadDays,
    });
  };

  if (isLoading) {
    return <div className="text-zinc-500">Loading...</div>;
  }

  return (
    <div className="max-w-lg space-y-6">
      <label className="flex items-center gap-2 text-sm text-zinc-300">
        <input type="checkbox" checked={isFree} onChange={(e) => setIsFree(e.target.checked)} />
        Make delivery free for everyone
      </label>

      {!isFree && (
        <>
          <div>
            <label className="text-sm text-zinc-400">Delivery charge (₹)</label>
            <input
              type="number"
              min={0}
              value={charge}
              onChange={(e) => setCharge(Number(e.target.value))}
              className="w-full mt-1 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
            />
          </div>
          <div>
            <label className="text-sm text-zinc-400">Free delivery above order value (₹)</label>
            <input
              type="number"
              min={0}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-full mt-1 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
            />
          </div>
        </>
      )}

      <div>
        <label className="text-sm text-zinc-400">Tax percent (%)</label>
        <input
          type="number"
          min={0}
          max={100}
          value={taxPercent}
          onChange={(e) => setTaxPercent(Number(e.target.value))}
          className="w-full mt-1 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
        />
      </div>

      <div>
        <label className="text-sm text-zinc-400">Minimum delivery lead time (days)</label>
        <input
          type="number"
          min={0}
          value={leadDays}
          onChange={(e) => setLeadDays(Number(e.target.value))}
          className="w-full mt-1 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
        />
        <p className="text-xs text-zinc-600 mt-1">Set to 1 for next-day-only pre-booking, 0 to allow same-day.</p>
      </div>

      {update.isError && <p className="text-sm text-red-400">{(update.error as Error).message}</p>}

      <button
        onClick={handleSave}
        disabled={update.isPending}
        className="flex items-center gap-2 rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-white disabled:opacity-50"
      >
        {update.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        Save Settings
      </button>
    </div>
  );
}