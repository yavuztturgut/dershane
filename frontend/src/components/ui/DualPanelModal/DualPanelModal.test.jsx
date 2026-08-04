import { MantineProvider } from '@mantine/core';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DualPanelModal } from './DualPanelModal';

const css = readFileSync(resolve(process.cwd(), 'src/components/ui/DualPanelModal/DualPanelModal.module.css'), 'utf8');

afterEach(() => {
  cleanup();
  window.matchMedia = vi.fn((query) => ({
    matches: false, media: query, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  }));
});

function renderModal(props = {}) {
  return render(
    <MantineProvider>
      <DualPanelModal
        opened
        onClose={vi.fn()}
        leftTitle="Lesson details"
        rightTitle="Attendance"
        leftContent={<div>Left body</div>}
        rightContent={<div>Right body</div>}
        activeTab="details"
        onActiveTabChange={vi.fn()}
        {...props}
      />
    </MantineProvider>,
  );
}

describe('DualPanelModal', () => {
  it('defines the desktop split, fixed equal height, and independent scroll bodies', () => {
    renderModal();
    expect(screen.getByTestId('dual-panel-left-scroll')).toBeInTheDocument();
    expect(screen.getByTestId('dual-panel-right-scroll')).toBeInTheDocument();
    expect(css).toContain('grid-template-columns: minmax(0, 40fr) minmax(0, 60fr)');
    expect(css).toContain('width: 100%');
    expect(css).toContain('height: 78dvh');
    expect(css).toContain('overflow-y: auto');
  });

  it('uses a full-screen mobile modal with details selected and keeps tab state controlled', () => {
    window.matchMedia = vi.fn((query) => ({
      matches: query === '(max-width: 48rem)', media: query, onchange: null,
      addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
    }));
    const onTabChange = vi.fn();
    renderModal({ onActiveTabChange: onTabChange });

    expect(screen.getByRole('radio', { name: 'Lesson details' })).toBeChecked();
    expect(document.querySelector('[data-full-screen="true"]')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Attendance' }));
    expect(onTabChange).toHaveBeenCalledWith('attendance');
  });
});
