import { Button, Center, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconInbox } from '@tabler/icons-react';

export function EmptyState({ message, actionLabel, onAction }) {
  return <Center className="min-h-64 rounded-xl border border-dashed border-gray-300 bg-white/60 p-6 text-center dark:border-dark-4 dark:bg-dark-7/40"><Stack align="center"><ThemeIcon size="xl" radius="xl" variant="light"><IconInbox size={22} /></ThemeIcon><div><Text fw={650}>{message}</Text><Text size="sm" c="dimmed" mt={4}>—</Text></div>{onAction && <Button variant="light" onClick={onAction}>{actionLabel}</Button>}</Stack></Center>;
}
