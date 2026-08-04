import { MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import { QueryClientProvider } from '@tanstack/react-query';
import './i18n';
import { queryClient } from '../shared/query/query-client';
import { AuthProvider } from '../features/auth/auth-context';
import { appTheme } from './theme';

export function AppProviders({ children }) {
  return (
    <MantineProvider theme={appTheme} defaultColorScheme="light">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ModalsProvider>
            <Notifications position="top-right" limit={3} />
            {children}
          </ModalsProvider>
        </AuthProvider>
      </QueryClientProvider>
    </MantineProvider>
  );
}
