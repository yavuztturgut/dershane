import { modals } from '@mantine/modals';
import { appModalClassNames } from './app-modal.styles';

export function openAppConfirmModal(options) {
  return modals.openConfirmModal({
    centered: true,
    overlayProps: { backgroundOpacity: 0.48, blur: 3 },
    classNames: appModalClassNames,
    labels: options.labels,
    title: options.title,
    children: options.children,
    confirmProps: options.confirmProps,
    cancelProps: options.cancelProps,
    onConfirm: options.onConfirm,
  });
}
