import { Paper } from '@mantine/core';
import styles from './Surface.module.css';

export function Surface({ children, className = '', ...props }) {
  return <Paper className={`${styles.surface} ${className}`} {...props}>{children}</Paper>;
}
