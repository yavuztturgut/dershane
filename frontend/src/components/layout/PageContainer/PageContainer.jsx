import styles from './PageContainer.module.css';

export function PageContainer({ children, wide = false }) {
  return <div className={wide ? styles.wide : styles.default}>{children}</div>;
}
