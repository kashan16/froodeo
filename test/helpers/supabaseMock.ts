import { vi } from 'vitest';

export function createChain(finalResult: { data: unknown; error: unknown; count?: number | null }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = {};
  const methods = [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'in', 'or', 'is',
    'order', 'range', 'limit',
  ];
  for (const m of methods) {
    chain[m] = vi.fn(() => chain);
  }
  chain.single = vi.fn().mockResolvedValue(finalResult);
  chain.maybeSingle = vi.fn().mockResolvedValue(finalResult);
  chain.then = (resolve: (v: typeof finalResult) => void) => resolve(finalResult);
  return chain;
}

export function createSupabaseMock() {
  const fromMock = vi.fn();
  const rpcMock = vi.fn();
  return {
    from: fromMock,
    rpc: rpcMock,
    __queueFrom: (result: { data: unknown; error: unknown; count?: number | null }) => {
      fromMock.mockReturnValueOnce(createChain(result));
    },
    __queueRpc: (result: { data: unknown; error: unknown }) => {
      rpcMock.mockResolvedValueOnce(result);
    },
  };
}