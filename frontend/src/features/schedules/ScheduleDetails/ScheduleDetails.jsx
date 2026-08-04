import { Stack, Text } from '@mantine/core';
import { formatIstanbulDateTime } from '../../../shared/time/istanbul-date-time';

function DetailRow({ label, value }) {
  return <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-dark-5 dark:bg-dark-8"><Text size="xs" fw={700} tt="uppercase" c="dimmed">{label}</Text><Text size="sm" fw={600} mt={4}>{value}</Text></div>;
}

export function ScheduleDetails({ schedule, locale, t }) {
  return <Stack gap="sm"><DetailRow label={t('course')} value={schedule.course_name} /><DetailRow label={t('class')} value={schedule.class_name} /><DetailRow label={t('teacher')} value={schedule.teacher_name} /><DetailRow label={t('start')} value={formatIstanbulDateTime(schedule.start_time, locale)} /><DetailRow label={t('end')} value={formatIstanbulDateTime(schedule.end_time, locale)} /></Stack>;
}
