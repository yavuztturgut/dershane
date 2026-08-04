import { useEffect, useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { authApi } from './auth.api';
import { queryClient } from '../../shared/query/query-client';
import { setUnauthorizedHandler } from '../../shared/api/api-client';
import { notifyError } from '../../shared/notifications/notifications';
import i18n from '../../app/i18n';
import { AuthContext } from './auth-context-value';
import { cachePolicy } from '../../shared/query/cache-policy';
import { queryKeys } from '../../shared/query/query-keys';

const profileKey = queryKeys.auth.profile;

export function AuthProvider({ children }) {
  const profileQuery = useQuery({
    queryKey: profileKey,
    queryFn: authApi.getProfile,
    retry: false,
    staleTime: cachePolicy.profile,
  });

  useEffect(() => {
    setUnauthorizedHandler(() => {
      queryClient.setQueryData(profileKey, null);
    });

    return () => setUnauthorizedHandler(undefined);
  }, []);

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (user) => queryClient.setQueryData(profileKey, user),
  });

  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      queryClient.removeQueries({ queryKey: profileKey });
      queryClient.clear();
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: authApi.updateProfile,
    onSuccess: (user) => queryClient.setQueryData(profileKey, user),
  });

  const changePasswordMutation = useMutation({ mutationFn: authApi.changePassword });

  const value = useMemo(() => ({
    user: profileQuery.data || null,
    isLoading: profileQuery.isLoading,
    login: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    logout: async () => {
      try {
        await logoutMutation.mutateAsync();
      } catch {
        notifyError(i18n.t('errors.LOGOUT_FAILED'));
      }
    },
    updateProfile: updateProfileMutation.mutateAsync,
    isUpdatingProfile: updateProfileMutation.isPending,
    changePassword: async (data) => {
      await changePasswordMutation.mutateAsync(data);
      queryClient.clear();
    },
    isChangingPassword: changePasswordMutation.isPending,
  }), [profileQuery.data, profileQuery.isLoading, loginMutation, logoutMutation, updateProfileMutation, changePasswordMutation]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
