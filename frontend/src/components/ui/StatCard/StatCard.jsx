import { Group, Text, ThemeIcon } from '@mantine/core';
import { Surface } from '../Surface/Surface';

export function StatCard({ label, value, icon: Icon, color = 'blue', compact = false }) {
  return <Surface p={compact ? 'md' : 'lg'}><Group justify="space-between" align="flex-start"><div><Text size="sm" c="dimmed" fw={500}>{label}</Text><Text fz={compact ? '1.75rem' : '2rem'} fw={750} lh={1.15} mt={compact ? 4 : 'xs'}>{value}</Text></div>{Icon && <ThemeIcon size={compact ? 'lg' : 'xl'} radius="lg" variant="light" color={color}><Icon size={compact ? 20 : 22} /></ThemeIcon>}</Group></Surface>;
}
