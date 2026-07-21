import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageLoader } from './PageLoader';

describe('PageLoader', () => {
  it('renders an accessible loader', () => {
    render(<MantineProvider><PageLoader /></MantineProvider>);
    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
  });
});
