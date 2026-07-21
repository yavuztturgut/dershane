import { createContext, useContext, useEffect, useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { authApi } from './auth.api';
import { queryClient } from '../../lib/query-client';
import { setUnauthorizedHandler } from '../../lib/api-client';

const AuthContext = createContext(null);
const profileKey = ['auth', 'profile'];

export function AuthProvider({ children }) {
  const profileQuery = useQuery({
    queryKey: profileKey,
    queryFn: authApi.getProfile,
    retry: false,
    staleTime: 5 * 60 * 1000,
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

  const value = useMemo(() => ({
    user: profileQuery.data || null,
    isLoading: profileQuery.isLoading,
    login: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    logout: async () => {
      try {
        await logoutMutation.mutateAsync();
      } catch {
        notifications.show({ color: 'red', message: 'Unable to log out.' });
      }
    },
  }), [profileQuery.data, profileQuery.isLoading, loginMutation, logoutMutation]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
