import { ActionIcon, Modal, SegmentedControl, Text } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconX } from '@tabler/icons-react';
import styles from './DualPanelModal.module.css';

export function DualPanelModal({
  opened,
  onClose,
  leftTitle,
  rightTitle,
  leftContent,
  rightContent,
  leftFooter,
  rightFooter,
  activeTab,
  onActiveTabChange,
  closeLabel = 'Close',
}) {
  const isMobile = useMediaQuery('(max-width: 48rem)');

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      withCloseButton={false}
      fullScreen={isMobile}
      centered={!isMobile}
      size="90rem"
      overlayProps={{ backgroundOpacity: 0.48, blur: 3 }}
      classNames={{ content: styles.content, body: styles.body }}
    >
      <div className={styles.panels} data-testid="dual-panel-modal">
        <div className={styles.mobileTabs}>
          <SegmentedControl
            className={styles.tabsControl}
            fullWidth
            value={activeTab}
            onChange={onActiveTabChange}
            data={[
              { value: 'details', label: leftTitle },
              { value: 'attendance', label: rightTitle },
            ]}
          />
          <ActionIcon className={styles.mobileClose} variant="subtle" onClick={onClose} aria-label={closeLabel}>
            <IconX size={20} />
          </ActionIcon>
        </div>

        <section className={styles.panel} data-active={activeTab === 'details'} data-testid="dual-panel-left">
          <header className={styles.header}><Text fw={650} size="lg">{leftTitle}</Text></header>
          <div className={styles.scrollBody} data-testid="dual-panel-left-scroll">{leftContent}</div>
          {leftFooter && <footer className={styles.footer}>{leftFooter}</footer>}
        </section>

        <section className={styles.panel} data-active={activeTab === 'attendance'} data-testid="dual-panel-right">
          <header className={styles.header}>
            <Text fw={650} size="lg">{rightTitle}</Text>
            <ActionIcon className={styles.desktopClose} variant="subtle" onClick={onClose} aria-label={closeLabel}>
              <IconX size={20} />
            </ActionIcon>
          </header>
          <div className={styles.scrollBody} data-testid="dual-panel-right-scroll">{rightContent}</div>
          {rightFooter && <footer className={styles.footer}>{rightFooter}</footer>}
        </section>
      </div>
    </Modal>
  );
}
