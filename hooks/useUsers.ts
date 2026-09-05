import { User } from '@/app/api/types';
import { apiFetch } from '@/context/AuthContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const API_URL = '/api/users';

const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  detail: (id: string) => [...userKeys.all, 'detail', id] as const,
};

async function parseOrThrow(res: Response, fallback: string) {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || fallback);
  return json;
}

// Admin-only listing — relies on the admin_token cookie.
export function useUsers() {
  return useQuery({
    queryKey: userKeys.lists(),
    queryFn: async () => {
      const res = await fetch(API_URL, { credentials: 'include' });
      const json = await parseOrThrow(res, 'Failed to fetch users');
      return json.data as User[];
    },
  });
}

// Fetch any user by id — works for an admin (cookie) or a user fetching
// their own id (access token). For "my own profile", prefer useMe()
// instead, which doesn't require knowing your own id up front.
export function useUser(id: string) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: async () => {
      const res = await apiFetch(`${API_URL}/${id}`);
      const json = await parseOrThrow(res, 'Failed to fetch user');
      return json.data as User;
    },
    enabled: !!id,
  });
}

// useCreateUser removed — POST /api/users is disabled (405). Accounts are
// only ever created inside /api/auth/verify-otp, via useAuth().verifyOtp().

// Self-only — the route rejects anyone whose access token doesn't match
// :id. Only `name` is editable here; phone is the OTP-verified identity
// and isn't changeable through this endpoint.
export function useUpdateUser(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name: string }) => {
      const res = await apiFetch(`${API_URL}/${id}`, { method: 'PUT', body: JSON.stringify(body) });
      const json = await parseOrThrow(res, 'Failed to update user');
      return json.data as User;
    },
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      queryClient.setQueryData(userKeys.detail(updatedUser.id), updatedUser);
      queryClient.setQueryData(['me'], updatedUser);
    },
  });
}

// Admin-only.
export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to delete user');
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      queryClient.removeQueries({ queryKey: userKeys.detail(id) });
    },
  });
}