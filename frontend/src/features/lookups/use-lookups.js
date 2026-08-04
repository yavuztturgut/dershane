import { useQuery } from '@tanstack/react-query';
import { cachePolicy } from '../../lib/cache-policy';
import { queryKeys } from '../../lib/query-keys';
import { lookupsApi } from './lookups.api';

export function useLookups(enabled = true) {
  return useQuery({
    queryKey: queryKeys.lookups.all,
    queryFn: lookupsApi.getAll,
    staleTime: cachePolicy.lookups,
    enabled,
  });
}
