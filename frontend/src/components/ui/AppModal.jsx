import { Modal } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { appModalClassNames } from './app-modal.styles';

export function AppModal({
  opened,
  onClose,
  title,
  children,
  size = 'md',
  fullScreen,
  centered,
}) {
  const isMobile = useMediaQuery('(max-width: 48rem)');
  const shouldFullScreen = fullScreen ?? isMobile;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={title}
      size={size}
      fullScreen={shouldFullScreen}
      centered={centered ?? !shouldFullScreen}
      overlayProps={{ backgroundOpacity: 0.48, blur: 3 }}
      classNames={appModalClassNames}
    >
      <div className="pt-1">
        {children}
      </div>
    </Modal>
  );
}
