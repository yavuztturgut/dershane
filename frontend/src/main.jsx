import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';
import './index.css';
import { AppProviders } from './app/providers';
import { AppRouter } from './app/router';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppProviders>
      <ErrorBoundary>
        <AppRouter />
      </ErrorBoundary>
    </AppProviders>
  </StrictMode>,
);
