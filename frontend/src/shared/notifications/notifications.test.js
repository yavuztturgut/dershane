import { notifications, notificationsStore } from '@mantine/notifications';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_NOTIFICATION_DURATION_MS,
  ERROR_NOTIFICATION_DURATION_MS,
  QUEUED_NOTIFICATION_LIMIT,
  VISIBLE_NOTIFICATION_LIMIT,
  notifyError,
  notifyInfo,
  notifySuccess,
} from './notifications';

function state() {
  return notificationsStore.getState();
}

function allNotifications() {
  return [...state().notifications, ...state().queue];
}

describe('notification manager', () => {
  beforeEach(() => {
    notifications.clean();
    notificationsStore.setState({
      notifications: [],
      queue: [],
      defaultPosition: 'top-right',
      limit: VISIBLE_NOTIFICATION_LIMIT,
    });
  });

  it('keeps at most three visible notifications and one queued notification', () => {
    for (let index = 1; index <= 6; index += 1) notifyInfo(`Message ${index}`);

    expect(state().notifications).toHaveLength(VISIBLE_NOTIFICATION_LIMIT);
    expect(state().queue).toHaveLength(QUEUED_NOTIFICATION_LIMIT);
    expect(state().queue[0].message).toBe('Message 6');
  });

  it('deduplicates the same kind and normalized message while it is active or queued', () => {
    notifySuccess(' Saved ');
    notifySuccess('Saved');

    expect(allNotifications()).toHaveLength(1);
    expect(allNotifications()[0]).toMatchObject({
      id: 'success:Saved',
      message: 'Saved',
      color: 'green',
      autoClose: DEFAULT_NOTIFICATION_DURATION_MS,
    });
  });

  it('allows the same message again after it has been closed', () => {
    notifyError('Network error');
    notifications.hide('error:Network error');
    notifyError('Network error');

    expect(allNotifications()).toHaveLength(1);
    expect(allNotifications()[0].autoClose).toBe(ERROR_NOTIFICATION_DURATION_MS);
  });

  it('prioritizes errors over success and info notifications', () => {
    notifySuccess('Success 1');
    notifyInfo('Info 1');
    notifySuccess('Success 2');
    notifyInfo('Newest normal');
    notifyError('Important error');

    expect(state().notifications.map((item) => item.message)).toContain('Important error');
    expect(state().queue).toHaveLength(1);
    expect(state().queue[0].message).toBe('Newest normal');
  });

  it('protects a queued error from a newer normal notification', () => {
    for (let index = 1; index <= 4; index += 1) notifyError(`Error ${index}`);
    notifySuccess('Later success');

    expect(state().queue).toHaveLength(1);
    expect(state().queue[0].message).toBe('Error 4');
  });
});
