import { Select, SimpleGrid, Stack } from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';

export function ScheduleFormFields({ form, courseOptions, classOptions, teacherOptions, t, stacked = false }) {
  const fields = <><Select label={t('course')} data={courseOptions} required {...form.getInputProps('course_id')} /><Select label={t('class')} data={classOptions} required {...form.getInputProps('class_id')} /><Select label={t('teacher')} data={teacherOptions} required {...form.getInputProps('teacher_id')} /></>;
  const times = <><DateTimePicker label={t('start')} required {...form.getInputProps('start_time')} /><DateTimePicker label={t('end')} required {...form.getInputProps('end_time')} /></>;
  return stacked ? <Stack gap="md">{fields}{times}</Stack> : <><SimpleGrid cols={{ base: 1, sm: 3 }}>{fields}</SimpleGrid><SimpleGrid cols={{ base: 1, sm: 2 }} mt="md">{times}</SimpleGrid></>;
}
