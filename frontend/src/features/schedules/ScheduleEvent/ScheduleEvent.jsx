import styles from './ScheduleEvent.module.css';

export function ScheduleEvent({ event }) {
  const { course_name, class_name, teacher_name } = event.extendedProps;
  const durationMinutes = (event.end?.getTime() - event.start?.getTime()) / 60000;
  return <div className={`${styles.event} ${durationMinutes <= 30 ? styles.compact : ''}`} title={`${course_name} · ${class_name} · ${teacher_name}`}><div className={styles.course}>{course_name}</div><div className={styles.meta}>{class_name} · {teacher_name}</div></div>;
}
