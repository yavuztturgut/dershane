import { useQueryClient } from '@tanstack/react-query';

export function useSuspendingQueries(entries) {
  const queryClient = useQueryClient();
  const pendingQueries = entries.filter(({ options, query }) => (
    options.enabled !== false && query.isPending && query.fetchStatus !== 'idle'
  ));

  if (pendingQueries.length) {
    throw Promise.all(pendingQueries.map(({ options }) => queryClient.fetchQuery(options)));
  }
}
