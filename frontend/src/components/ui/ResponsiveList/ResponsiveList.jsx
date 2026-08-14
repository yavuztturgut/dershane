import { useMediaQuery } from '@mantine/hooks';
import styles from './ResponsiveList.module.css';

export function ResponsiveList({ desktop, mobile }) {
  const isMobile = useMediaQuery('(max-width: 48rem)', false, { getInitialValueInEffect: false });
  return <div className={isMobile ? styles.mobile : styles.desktop}>{isMobile ? mobile : desktop}</div>;
}
