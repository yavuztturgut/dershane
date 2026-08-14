import { Stack, Text } from '@mantine/core';
import { Surface } from '../Surface/Surface';
import styles from './RecordCard.module.css';

export function RecordCard({ title, subtitle, fields = [], actions }) {
  return <Surface p="md"><div className={styles.header}><div className={styles.heading}><Text fw={700} truncate>{title}</Text>{subtitle && <Text size="sm" c="dimmed" truncate>{subtitle}</Text>}</div>{actions && <div className={styles.actions}>{actions}</div>}</div>{fields.length > 0 && <Stack gap="xs" mt="md">{fields.map(({ label, value }) => <div className={styles.field} key={label}><Text className={styles.fieldLabel} size="xs" c="dimmed">{label}</Text><Text className={styles.fieldValue} size="sm" ta="right">{value}</Text></div>)}</Stack>}</Surface>;
}
