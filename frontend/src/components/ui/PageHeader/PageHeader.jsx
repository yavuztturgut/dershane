import { Button, Group, Stack, Text, Title } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';

export function PageHeader({ title, description, onCreate, createLabel }) {
  return (
    <Group justify="space-between" align="flex-start" mb="xl" gap="md" wrap="wrap">
      <Stack gap={4}><Title order={1} className="text-2xl tracking-tight sm:text-3xl">{title}</Title>{description && <Text c="dimmed" size="sm">{description}</Text>}</Stack>
      {onCreate && <Button leftSection={<IconPlus size={16} />} onClick={onCreate}>{createLabel}</Button>}
    </Group>
  );
}
