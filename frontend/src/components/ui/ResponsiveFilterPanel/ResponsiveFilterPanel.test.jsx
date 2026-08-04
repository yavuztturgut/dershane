import { MantineProvider } from '@mantine/core';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ResponsiveFilterPanel } from './ResponsiveFilterPanel';

describe('ResponsiveFilterPanel', () => {
  afterEach(cleanup);

  it('keeps the mobile count beside the label and expands one shared filter body', () => {
    render(<MantineProvider><ResponsiveFilterPanel activeCount={3}><label>Course<input /></label></ResponsiveFilterPanel></MantineProvider>);
    const toggle = screen.getByRole('button', { name: /Filters 3/ });
    const label = screen.getByText('Filters').parentElement;

    expect(label).toHaveTextContent('Filters3');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('responsive-filter-body')).toHaveAttribute('data-open');
    expect(screen.getAllByLabelText('Course')).toHaveLength(1);
  });

  it('uses the same clear callback for desktop and mobile actions', () => {
    const onClear = vi.fn();
    render(<MantineProvider><ResponsiveFilterPanel activeCount={1} onClear={onClear}><input /></ResponsiveFilterPanel></MantineProvider>);
    const clearActions = screen.getAllByRole('button', { name: 'Clear filters' });

    expect(clearActions).toHaveLength(2);
    clearActions.forEach((action) => fireEvent.click(action));
    expect(onClear).toHaveBeenCalledTimes(2);
  });

  it('marks an embedded panel so a parent surface can use compact spacing', () => {
    const { container } = render(<MantineProvider><ResponsiveFilterPanel embedded><input /></ResponsiveFilterPanel></MantineProvider>);
    expect(container.querySelector('[data-embedded]')).toBeInTheDocument();
  });
});
