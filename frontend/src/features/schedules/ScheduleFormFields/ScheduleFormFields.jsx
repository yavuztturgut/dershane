import { Select, SimpleGrid, Stack } from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';

const mobileInputClassNames = { input: 'max-md:text-base' };

export function ScheduleFormFields({ form, courseOptions, classOptions, teacherOptions, t, stacked = false }) {
  const fields = <><Select classNames={mobileInputClassNames} label={t('course')} data={courseOptions} required {...form.getInputProps('course_id')} /><Select classNames={mobileInputClassNames} label={t('class')} data={classOptions} required {...form.getInputProps('class_id')} /><Select classNames={mobileInputClassNames} label={t('teacher')} data={teacherOptions} required {...form.getInputProps('teacher_id')} /></>;
  const times = <><DateTimePicker classNames={mobileInputClassNames} label={t('start')} required {...form.getInputProps('start_time')} /><DateTimePicker classNames={mobileInputClassNames} label={t('end')} required {...form.getInputProps('end_time')} /></>;
  return stacked ? <Stack gap="md">{fields}{times}</Stack> : <><SimpleGrid cols={{ base: 1, sm: 3 }}>{fields}</SimpleGrid><SimpleGrid cols={{ base: 1, sm: 2 }} mt="md">{times}</SimpleGrid></>;
}
