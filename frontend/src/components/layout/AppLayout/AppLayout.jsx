import { AppShell, Burger, Group, Text } from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppSidebar } from '../AppSidebar/AppSidebar';

export function AppLayout() {
  const [mobileOpened, { toggle: toggleMobile, close: closeMobile }] = useDisclosure(false);
  const [collapsed, { toggle: toggleCollapsed }] = useDisclosure(false);
  const isMobile = useMediaQuery('(max-width: 48rem)');
  const { t } = useTranslation();

  return (
    <AppShell
      header={isMobile ? { height: 64 } : undefined}
      navbar={{ width: collapsed ? 76 : 272, breakpoint: 'sm', collapsed: { mobile: !mobileOpened } }}
      padding="md"
    >
      {isMobile && (
        <AppShell.Header className="border-b border-gray-200 bg-white/90 backdrop-blur dark:border-dark-5 dark:bg-dark-7/90">
          <Group className="h-full px-4" justify="space-between">
            <Burger opened={mobileOpened} onClick={toggleMobile} size="sm" />
            <Text fw={700}>{t('appName')}</Text>
            <div className="w-9" />
          </Group>
        </AppShell.Header>
      )}
      <AppSidebar collapsed={collapsed} onToggle={toggleCollapsed} onNavigate={closeMobile} />
      <AppShell.Main className="min-w-0 max-w-full overflow-x-hidden">
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
