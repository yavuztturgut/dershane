import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

function ThrowingComponent() {
  throw new Error('Test render error');
}

describe('ErrorBoundary', () => {
  it('renders a recovery screen when a child throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <MantineProvider>
        <ErrorBoundary><ThrowingComponent /></ErrorBoundary>
      </MantineProvider>,
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });
});
