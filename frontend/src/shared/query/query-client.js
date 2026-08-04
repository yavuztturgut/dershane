import { QueryClient } from '@tanstack/react-query';
import { cachePolicy } from './cache-policy';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: cachePolicy.operational,
      gcTime: cachePolicy.garbageCollection,
      refetchOnWindowFocus: true,
    },
  },
});
