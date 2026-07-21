import { Center, Text } from '@mantine/core';

export function EmptyState({ message }) {
  return <Center className="min-h-48"><Text c="dimmed">{message}</Text></Center>;
}
