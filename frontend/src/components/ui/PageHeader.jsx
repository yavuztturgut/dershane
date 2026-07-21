import { Button, Group, Title } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';

export function PageHeader({ title, onCreate, createLabel }) {
  return (
    <Group justify="space-between" mb="lg">
      <Title order={1} className="text-2xl">{title}</Title>
      {onCreate && <Button leftSection={<IconPlus size={16} />} onClick={onCreate}>{createLabel}</Button>}
    </Group>
  );
}
