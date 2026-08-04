import { notifications, notificationsStore } from '@mantine/notifications';

export const VISIBLE_NOTIFICATION_LIMIT = 3;
export const QUEUED_NOTIFICATION_LIMIT = 1;
export const ERROR_NOTIFICATION_DURATION_MS = 5000;
export const DEFAULT_NOTIFICATION_DURATION_MS = 4000;

const ERROR_PRIORITY = 100;
let notificationOrder = 0;

function normalizeMessage(message) {
  return typeof message === 'string' && message.trim()
    ? message.trim()
    : 'Something went wrong. Please try again.';
}

function trimQueue() {
  const { queue } = notificationsStore.getState();
  if (queue.length <= QUEUED_NOTIFICATION_LIMIT) return;

  const retained = queue.reduce((best, item) => {
    if (!best || (item.priority ?? 0) > (best.priority ?? 0)) return item;
    if ((item.priority ?? 0) < (best.priority ?? 0)) return best;
    return item['data-notification-order'] > best['data-notification-order'] ? item : best;
  }, null);
  const queuedIds = new Set(queue.map((item) => item.id));

  notifications.updateState(
    notificationsStore,
    (items) => items.filter((item) => !queuedIds.has(item.id) || item.id === retained.id),
  );
}

function showNotification(kind, message, options) {
  const normalizedMessage = normalizeMessage(message);

  notifications.show({
    id: `${kind}:${normalizedMessage}`,
    message: normalizedMessage,
    color: options.color,
    autoClose: options.autoClose,
    priority: options.priority,
    'data-notification-kind': kind,
    'data-notification-order': notificationOrder,
  });
  notificationOrder += 1;
  trimQueue();
}

export function notifyError(message) {
  showNotification('error', message, {
    color: 'red',
    autoClose: ERROR_NOTIFICATION_DURATION_MS,
    priority: ERROR_PRIORITY,
  });
}

export function notifySuccess(message) {
  showNotification('success', message, {
    color: 'green',
    autoClose: DEFAULT_NOTIFICATION_DURATION_MS,
    priority: 0,
  });
}

export function notifyInfo(message) {
  showNotification('info', message, {
    color: 'blue',
    autoClose: DEFAULT_NOTIFICATION_DURATION_MS,
    priority: 0,
  });
}
