import { StatCard } from '../../../components/ui/StatCard/StatCard';
import styles from './DashboardMetricGrid.module.css';

export function DashboardMetricGrid({ metrics, values, t, compact = false }) {
  return <div className={compact ? `${styles.grid} ${styles.compact}` : styles.grid}>
    {metrics.map(([key, label, icon, color]) => (
      <StatCard key={key} label={t(label)} value={values[key]} icon={icon} color={color} compact />
    ))}
  </div>;
}
