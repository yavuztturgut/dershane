import { describe, expect, it } from 'vitest';
import { cachePolicy } from './cache-policy';
import { queryClient } from './query-client';
import { queryKeys } from './query-keys';

describe('query cache policy', () => {
  it('keeps operational data fresh for two minutes without polling', () => {
    const defaults = queryClient.getDefaultOptions().queries;

    expect(defaults.staleTime).toBe(cachePolicy.operational);
    expect(defaults.gcTime).toBe(cachePolicy.garbageCollection);
    expect(defaults.refetchOnWindowFocus).toBe(true);
    expect(defaults.refetchInterval).toBeUndefined();
  });

  it('reuses operational data while it is still fresh', async () => {
    queryClient.clear();
    let requestCount = 0;
    const queryFn = async () => ({ request: ++requestCount });
    const queryKey = queryKeys.schedules.list({ start: '2026-08-04' });

    const first = await queryClient.fetchQuery({ queryKey, queryFn });
    const second = await queryClient.fetchQuery({ queryKey, queryFn });

    expect(first).toEqual(second);
    expect(requestCount).toBe(1);
    queryClient.clear();
  });

  it('keeps list, detail and selector keys separate', () => {
    expect(queryKeys.users.list({ page: 1 })).not.toEqual(queryKeys.users.detail(1));
    expect(queryKeys.users.options({ role: 'student' })).not.toEqual(queryKeys.users.list({ role: 'student' }));
  });
});
