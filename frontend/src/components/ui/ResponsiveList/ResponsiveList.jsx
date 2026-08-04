import styles from './ResponsiveList.module.css';

export function ResponsiveList({ desktop, mobile }) {
  return <><div className={styles.desktop}>{desktop}</div><div className={styles.mobile}>{mobile}</div></>;
}
