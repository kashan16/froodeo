import { Category } from '@/app/api/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const API_URL = '/api/categories';

const categoryKeys = {
  all: ['categories'] as const,
  lists: () => [...categoryKeys.all, 'list'] as const,
  details: () => [...categoryKeys.all, 'detail'] as const,
  detail: (id: string) => [...categoryKeys.details(), id] as const,
};

async function parseOrThrow(res: Response, fallback: string) {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || fallback);
  return json;
}

export function useCategories() {
  return useQuery({
    queryKey: categoryKeys.lists(),
    queryFn: async () => {
      const res = await fetch(API_URL);
      const json = await parseOrThrow(res, 'Failed to fetch categories');
      return json.data as Category[];
    },
  });
}

export function useCategory(id: string) {
  return useQuery({
    queryKey: categoryKeys.detail(id),
    queryFn: async () => {
      const res = await fetch(`${API_URL}/${id}`);
      const json = await parseOrThrow(res, 'Failed to fetch category');
      return json.data as Category;
    },
    enabled: !!id,
  });
}

// Admin-only — relies on the admin_token cookie, sent automatically
// same-origin. If not logged in as admin, this throws 'Unauthorized'.
export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<Category>) => {
      const res = await fetch(API_URL, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await parseOrThrow(res, 'Failed to create category');
      return json.data as Category;
    },
    onSuccess: (newCategory) => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.lists() });
      queryClient.setQueryData(categoryKeys.detail(newCategory.id), newCategory);
    },
  });
}

export function useUpdateCategory(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<Category>) => {
      const res = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await parseOrThrow(res, 'Failed to update category');
      return json.data as Category;
    },
    onSuccess: (updatedCategory) => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.lists() });
      queryClient.setQueryData(categoryKeys.detail(id), updatedCategory);
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to delete category');
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.lists() });
      queryClient.removeQueries({ queryKey: categoryKeys.detail(id) });
    },
  });
}