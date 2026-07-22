import { notifications } from '@mantine/notifications';

export const ERROR_NOTIFICATION_COOLDOWN_MS = 5000;

const lastShownAt = new Map();

function getErrorNotificationId(message) {
  return `error:${message}`;
}

export function notifyError(message) {
  const normalizedMessage = typeof message === 'string' && message.trim()
    ? message.trim()
    : 'Something went wrong. Please try again.';
  const id = getErrorNotificationId(normalizedMessage);
  const now = Date.now();
  const lastShown = lastShownAt.get(id);

  if (lastShown !== undefined && now - lastShown < ERROR_NOTIFICATION_COOLDOWN_MS) return;

  lastShownAt.set(id, now);
  notifications.show({ id, color: 'red', message: normalizedMessage, autoClose: ERROR_NOTIFICATION_COOLDOWN_MS });
  notifications.cleanQueue();
}
