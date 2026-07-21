import { Button, Paper, Stack, Text, Title } from '@mantine/core';
import { Component } from 'react';
import i18n from '../../app/i18n';

export class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error('Unhandled application error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="grid min-h-screen place-items-center bg-gray-50 px-4 dark:bg-dark-8">
          <Paper withBorder shadow="sm" p="xl" className="w-full max-w-md">
            <Stack gap="sm">
              <Title order={1} className="text-2xl">{i18n.t('unexpectedError')}</Title>
              <Text c="dimmed">{i18n.t('unexpectedErrorMessage')}</Text>
              <Button onClick={() => window.location.reload()}>{i18n.t('reload')}</Button>
            </Stack>
          </Paper>
        </main>
      );
    }

    return this.props.children;
  }
}
