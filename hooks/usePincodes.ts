import { useMutation } from '@tanstack/react-query';

interface PincodeCheckResult {
  serviceable: boolean;
  area_name: string | null;
}

export function useCheckPincode() {
  return useMutation({
    mutationFn: async (pincode: string) => {
      const res = await fetch(`/api/pincodes/check?pincode=${encodeURIComponent(pincode)}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to check pincode');
      return json.data as PincodeCheckResult;
    },
  });
}