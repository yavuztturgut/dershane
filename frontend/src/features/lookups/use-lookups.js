import { useQuery } from '@tanstack/react-query';
import { cachePolicy } from '../../shared/query/cache-policy';
import { queryKeys } from '../../shared/query/query-keys';
import { lookupsApi } from './lookups.api';

export function getLookupsQueryOptions(enabled = true) {
  return {
    queryKey: queryKeys.lookups.all,
    queryFn: lookupsApi.getAll,
    staleTime: cachePolicy.lookups,
    enabled,
  };
}

export function useLookups(enabled = true) {
  return useQuery(getLookupsQueryOptions(enabled));
}
