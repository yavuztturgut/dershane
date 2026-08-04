import { ActionIcon } from '@mantine/core';
import { IconLanguage } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

export function LanguageToggle({ className }) {
  const { t, i18n } = useTranslation();

  function toggleLanguage() {
    const nextLanguage = i18n.resolvedLanguage === 'tr' ? 'en' : 'tr';
    localStorage.setItem('language', nextLanguage);
    i18n.changeLanguage(nextLanguage);
  }

  return (
    <ActionIcon
      variant="light"
      onClick={toggleLanguage}
      aria-label={t('language')}
      className={className}
    >
      <IconLanguage size={18} />
    </ActionIcon>
  );
}
