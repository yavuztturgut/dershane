import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ResponsiveList } from './ResponsiveList';

function setMobile(matches) {
  window.matchMedia = vi.fn(() => ({
    matches,
    media: '(max-width: 48rem)',
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

describe('ResponsiveList', () => {
  afterEach(cleanup);

  it('renders only the desktop tree on a wide viewport', () => {
    setMobile(false);
    render(<ResponsiveList desktop={<div>Desktop rows</div>} mobile={<div>Mobile cards</div>} />);
    expect(screen.getByText('Desktop rows')).toBeInTheDocument();
    expect(screen.queryByText('Mobile cards')).not.toBeInTheDocument();
  });

  it('renders only the mobile tree on a narrow viewport', () => {
    setMobile(true);
    render(<ResponsiveList desktop={<div>Desktop rows</div>} mobile={<div>Mobile cards</div>} />);
    expect(screen.getByText('Mobile cards')).toBeInTheDocument();
    expect(screen.queryByText('Desktop rows')).not.toBeInTheDocument();
  });
});
