import { adminFetch } from '@/lib/adminApi';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface Product {
    id: string;
    category_id: string | null;
    name: string;
    description: string | null;
    price: number;
    image_url: string | null;
    rating: number;
    is_available: boolean;
    is_featured: boolean;
    loyalty_points: number;
    stock_quantity: number | null;
    categories?: { id: string; name: string } | null;
}

interface ProductFilters {
    category_id?: string;
    search?: string;
}

const KEY = ['admin-products'];

export function useAdminProducts(filters: ProductFilters = {}) {
    const params = new URLSearchParams();
    if (filters.category_id) params.set('category_id', filters.category_id);
    params.set('available', 'false'); // admin sees everything; 'available=false' skips the is_available filter server-side

    return useQuery({
        queryKey: [...KEY, filters],
        queryFn: () =>
        adminFetch<{ data: Product[] }>(`/api/products?${params.toString()}`).then((r) => {
            if (!filters.search) return r.data;
            const q = filters.search.toLowerCase();
            return r.data.filter((p) => p.name.toLowerCase().includes(q));
        }),
    });
}

export function useProduct(id: string | null) {
    return useQuery({
        queryKey: ['admin-product', id],
        queryFn: () => adminFetch<{ data: Product }>(`/api/products/${id}`).then((r) => r.data),
        enabled: !!id,
    });
}

export function useCreateProduct() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (payload: Partial<Product>) =>
        adminFetch<{ data: Product }>('/api/products', { method: 'POST', body: JSON.stringify(payload) }),
        onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
    });
}

export function useUpdateProduct() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...payload }: Partial<Product> & { id: string }) =>
        adminFetch<{ data: Product }>(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
        onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
    });
}

export function useDeleteProduct() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => adminFetch(`/api/products/${id}`, { method: 'DELETE' }),
        onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
    });
}