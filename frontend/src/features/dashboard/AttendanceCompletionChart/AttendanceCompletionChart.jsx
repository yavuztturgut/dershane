import { BarChart } from '@mantine/charts';
import { Surface } from '../../../components/ui/Surface/Surface';
import styles from './AttendanceCompletionChart.module.css';

function formatDay(date, locale) {
  return new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric' }).format(new Date(`${date}T00:00:00`));
}

export function AttendanceCompletionChart({ data, locale, t }) {
  const chartData = data.map((item) => ({ ...item, day: formatDay(item.date, locale) }));
  const hasLessons = data.some((item) => item.completed + item.missing > 0);

  return <Surface className={styles.surface}>
    <div>
      <h2 className={styles.title}>{t('dashboardOverview.weeklyAttendance')}</h2>
      <p className={styles.description}>{t('dashboardOverview.weeklyAttendanceDescription')}</p>
    </div>
    {hasLessons ? <BarChart
      className={styles.chart}
      data={chartData}
      dataKey="day"
      type="stacked"
      withLegend
      series={[
        { name: 'completed', label: t('dashboardOverview.chartCompleted'), color: 'green.6' },
        { name: 'missing', label: t('dashboardOverview.chartMissing'), color: 'red.6' },
      ]}
      yAxisProps={{ allowDecimals: false }}
      gridAxis="y"
    /> : <div className={styles.empty}>{t('dashboardOverview.noCompletedLessonsThisWeek')}</div>}
  </Surface>;
}
