import { MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import { QueryClientProvider } from '@tanstack/react-query';
import './i18n';
import { queryClient } from '../lib/query-client';
import { AuthProvider } from '../features/auth/auth-context';

export function AppProviders({ children }) {
  return (
    <MantineProvider defaultColorScheme="light">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ModalsProvider>
            <Notifications position="top-right" />
            {children}
          </ModalsProvider>
        </AuthProvider>
      </QueryClientProvider>
    </MantineProvider>
  );
}
