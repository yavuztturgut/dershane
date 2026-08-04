import { Group, Stack, Text } from '@mantine/core';
import { Surface } from '../Surface/Surface';

export function RecordCard({ title, subtitle, fields = [], actions }) {
  return <Surface p="md"><Group justify="space-between" align="flex-start" wrap="nowrap"><div className="min-w-0"><Text fw={700} truncate>{title}</Text>{subtitle && <Text size="sm" c="dimmed" truncate>{subtitle}</Text>}</div>{actions}</Group>{fields.length > 0 && <Stack gap="xs" mt="md">{fields.map(({ label, value }) => <Group key={label} justify="space-between" gap="lg" wrap="nowrap"><Text size="xs" c="dimmed">{label}</Text><Text size="sm" ta="right">{value}</Text></Group>)}</Stack>}</Surface>;
}
