import { beforeEach, describe, expect, it, vi } from 'vitest';

const { show, cleanQueue } = vi.hoisted(() => ({
  show: vi.fn(),
  cleanQueue: vi.fn(),
}));

vi.mock('@mantine/notifications', () => ({
  notifications: { show, cleanQueue },
}));

import { ERROR_NOTIFICATION_COOLDOWN_MS, notifyError } from './notifications';

describe('notifyError', () => {
  beforeEach(() => {
    show.mockClear();
    cleanQueue.mockClear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-22T10:00:00'));
  });

  it('shows the same error only once during the cooldown', () => {
    notifyError('Network error');
    notifyError('Network error');

    expect(show).toHaveBeenCalledTimes(1);
    expect(cleanQueue).toHaveBeenCalledTimes(1);
  });

  it('shows the same error again after the cooldown', () => {
    notifyError('Timeout error');
    vi.advanceTimersByTime(ERROR_NOTIFICATION_COOLDOWN_MS);
    notifyError('Timeout error');

    expect(show).toHaveBeenCalledTimes(2);
  });
});
