import { ActionIcon, useMantineColorScheme } from '@mantine/core';
import { IconMoon, IconSun } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

export function ThemeToggle({ className }) {
  const { t } = useTranslation();
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  function toggleColorScheme() {
    setColorScheme(isDark ? 'light' : 'dark');
  }

  return (
    <ActionIcon
      variant="light"
      onClick={toggleColorScheme}
      aria-label={isDark ? t('light') : t('dark')}
      className={className}
    >
      {isDark ? <IconSun size={18} /> : <IconMoon size={18} />}
    </ActionIcon>
  );
}
