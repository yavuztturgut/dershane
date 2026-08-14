import { Popover, Stack, Text, UnstyledButton } from '@mantine/core';
import { useState } from 'react';
import { formatIstanbulTime } from '../../../shared/time/istanbul-date-time';
import styles from './ScheduleGroupEvent.module.css';

export function ScheduleGroupEvent({ event, locale, onSelectSchedule, t }) {
  const [opened, setOpened] = useState(false);
  const { schedules, start_time: startTime, end_time: endTime } = event.extendedProps;
  const sortedSchedules = [...schedules].sort((first, second) => (
    first.class_name.localeCompare(second.class_name, locale)
    || first.course_name.localeCompare(second.course_name, locale)
  ));
  const timeRange = `${formatIstanbulTime(startTime, locale)}–${formatIstanbulTime(endTime, locale)}`;

  function openSchedule(scheduleId, clickEvent) {
    clickEvent.stopPropagation();
    setOpened(false);
    onSelectSchedule(scheduleId);
  }

  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      width={340}
      position="right"
      withArrow
      shadow="md"
      withinPortal
      trapFocus
      returnFocus
    >
      <Popover.Target>
        <button
          type="button"
          className={styles.trigger}
          onClick={(clickEvent) => {
            clickEvent.stopPropagation();
            setOpened((current) => !current);
          }}
          aria-label={t('openSimultaneousLessons', { count: schedules.length, time: timeRange })}
          aria-expanded={opened}
        >
          <span className={styles.count}>{t('simultaneousLessons', { count: schedules.length })}</span>
          <span className={styles.time}>{timeRange}</span>
        </button>
      </Popover.Target>
      <Popover.Dropdown onClick={(clickEvent) => clickEvent.stopPropagation()}>
        <Text fw={700} size="sm">{t('simultaneousLessons', { count: schedules.length })}</Text>
        <Text c="dimmed" size="xs" mb="xs">{timeRange}</Text>
        <Stack gap={4} className={styles.lessonList}>
          {sortedSchedules.map((schedule) => (
            <UnstyledButton
              key={schedule.id}
              className={styles.lesson}
              onClick={(clickEvent) => openSchedule(schedule.id, clickEvent)}
              aria-label={`${schedule.course_name} · ${schedule.class_name} · ${schedule.teacher_name}`}
            >
              <Text fw={700} size="sm" truncate>{schedule.course_name}</Text>
              <Text c="dimmed" size="xs" truncate>{schedule.class_name} · {schedule.teacher_name}</Text>
            </UnstyledButton>
          ))}
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
