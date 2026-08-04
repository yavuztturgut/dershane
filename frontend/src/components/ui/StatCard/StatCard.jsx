import { Group, Text, ThemeIcon } from '@mantine/core';
import { Surface } from '../Surface/Surface';

export function StatCard({ label, value, icon: Icon, color = 'blue' }) {
  return <Surface p="lg"><Group justify="space-between" align="flex-start"><div><Text size="sm" c="dimmed" fw={500}>{label}</Text><Text fz="2rem" fw={750} lh={1.15} mt="xs">{value}</Text></div>{Icon && <ThemeIcon size="xl" radius="lg" variant="light" color={color}><Icon size={22} /></ThemeIcon>}</Group></Surface>;
}
