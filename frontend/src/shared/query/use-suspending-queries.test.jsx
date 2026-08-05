import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { act, cleanup, render, screen } from '@testing-library/react';
import { Suspense } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useSuspendingQueries } from './use-suspending-queries';

function SuspendedQuery({ queryFn }) {
  const options = { queryKey: ['suspense-test'], queryFn, staleTime: 60_000 };
  const query = useQuery(options);
  useSuspendingQueries([{ query, options }]);
  return <p>{query.data}</p>;
}

describe('useSuspendingQueries', () => {
  afterEach(cleanup);

  it('waits for one in-flight request without starting duplicates', async () => {
    let resolveQuery;
    const queryFn = vi.fn(() => new Promise((resolve) => { resolveQuery = resolve; }));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={client}>
        <Suspense fallback={<p>Waiting</p>}><SuspendedQuery queryFn={queryFn} /></Suspense>
      </QueryClientProvider>,
    );

    expect(screen.getByText('Waiting')).toBeInTheDocument();
    expect(queryFn).toHaveBeenCalledTimes(1);
    await act(async () => resolveQuery('Ready'));
    expect(await screen.findByText('Ready')).toBeInTheDocument();
    expect(queryFn).toHaveBeenCalledTimes(1);
  });
});
