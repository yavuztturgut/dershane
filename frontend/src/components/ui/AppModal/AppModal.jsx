import { Modal } from '@mantine/core';
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
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={title}
      size={size}
      fullScreen={fullScreen ?? false}
      centered={centered ?? true}
      overlayProps={{ backgroundOpacity: 0.48, blur: 3 }}
      classNames={appModalClassNames}
    >
      <div className="pt-1">
        {children}
      </div>
    </Modal>
  );
}
