import { ActionIcon, Badge, Button, Tooltip } from '@mantine/core';
import { IconAdjustmentsHorizontal, IconChevronDown, IconX } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Surface } from '../Surface/Surface';
import styles from './ResponsiveFilterPanel.module.css';

export function ResponsiveFilterPanel({ primary, activeCount = 0, onClear, children, embedded = false }) {
  const { t } = useTranslation();
  const [opened, setOpened] = useState(false);

  return <Surface className={styles.panel} data-has-primary={Boolean(primary) || undefined} data-embedded={embedded || undefined} mb={embedded ? 0 : 'lg'}>
    <div className={styles.header} data-has-primary={Boolean(primary) || undefined}>
      {primary && <div className={styles.primary}>{primary}</div>}
      <Button
        className={styles.toggle}
        variant="light"
        justify="space-between"
        leftSection={<IconAdjustmentsHorizontal size={18} />}
        rightSection={<IconChevronDown className={styles.chevron} data-open={opened || undefined} size={18} />}
        onClick={() => setOpened((value) => !value)}
        aria-expanded={opened}
      >
        <span className={styles.toggleLabel}><span>{t('filters')}</span>{activeCount > 0 && <Badge circle>{activeCount}</Badge>}</span>
      </Button>
    </div>
    <div className={styles.body} data-open={opened || undefined} data-testid="responsive-filter-body">
      <div className={styles.bodyInner}>
        <div className={styles.fields}>{children}</div>
        {activeCount > 0 && onClear && <>
          <Tooltip label={t('clearFilters')}>
            <ActionIcon className={styles.desktopClear} variant="light" color="red" radius="xl" onClick={onClear} aria-label={t('clearFilters')}>
              <IconX size={18} />
            </ActionIcon>
          </Tooltip>
          <Button className={styles.mobileClear} variant="subtle" color="red" leftSection={<IconX size={16} />} onClick={onClear}>{t('clearFilters')}</Button>
        </>}
      </div>
    </div>
  </Surface>;
}
