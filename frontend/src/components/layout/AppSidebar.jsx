import { ActionIcon, AppShell, Group, NavLink, Select, Stack, Text } from '@mantine/core';
import {
  IconBook2, IconCalendarEvent, IconChevronLeft, IconChevronRight, IconDashboard,
  IconLogout, IconSchool, IconUser, IconUsers, IconUserShield, IconChecklist,
} from '@tabler/icons-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../features/auth/use-auth';
import { ThemeToggle } from '../ui/ThemeToggle';
import { LanguageToggle } from '../ui/LanguageToggle';

const adminItems = [
  { to: '/', key: 'dashboard', icon: IconDashboard },
  { to: '/users', key: 'users', icon: IconUsers },
  { to: '/roles', key: 'roles', icon: IconUserShield },
  { to: '/classes', key: 'classes', icon: IconSchool },
  { to: '/courses', key: 'courses', icon: IconBook2 },
  { to: '/schedules', key: 'schedules', icon: IconCalendarEvent },
  { to: '/attendance', key: 'attendance', icon: IconChecklist },
];

export function AppSidebar({ collapsed, onToggle, onNavigate }) {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const items = user.role_name === 'admin' ? adminItems : [
    { to: '/schedules', key: 'mySchedule', icon: IconCalendarEvent },
    ...(user.role_name === 'student' ? [{ to: '/attendance', key: 'attendance', icon: IconChecklist }] : []),
  ];

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  function changeLanguage(language) {
    if (!language) return;
    localStorage.setItem('language', language);
    i18n.changeLanguage(language);
  }

  return (
    <AppShell.Navbar className="flex flex-col border-r border-gray-200 dark:border-dark-5">
      <Group className="min-h-16 border-b border-gray-200 px-4 dark:border-dark-5" justify="space-between">
        {!collapsed && <Text fw={700}>{t('appName')}</Text>}
        <ActionIcon variant="subtle" onClick={onToggle} aria-label={t('toggleSidebar')} visibleFrom="sm">
          {collapsed ? <IconChevronRight size={18} /> : <IconChevronLeft size={18} />}
        </ActionIcon>
      </Group>

      <div className="flex-1 px-2 py-4">
        {items.map(({ to, key, icon: Icon }) => (
          <NavLink
            key={to}
            component={Link}
            to={to}
            label={collapsed ? undefined : t(key)}
            leftSection={<Icon size={19} />}
            active={location.pathname === to}
            onClick={onNavigate}
            className="mb-1 rounded-md"
          />
        ))}
        <NavLink
          component={Link}
          to="/profile"
          label={collapsed ? undefined : t('profile')}
          leftSection={<IconUser size={19} />}
          active={location.pathname === '/profile'}
          onClick={onNavigate}
          className="mb-1 rounded-md"
        />
      </div>

      <div className="border-t border-gray-200 p-3 dark:border-dark-5">
        {!collapsed && <Text size="sm" fw={600} mb={user.role_name === 'admin' ? 0 : 'sm'} truncate>{user.name}</Text>}
        {!collapsed && user.role_name === 'admin' && <Text size="xs" c="dimmed" mb="sm">{user.role_name}</Text>}
        {collapsed ? (
          <Stack data-testid="collapsed-sidebar-actions" gap="xs" align="center">
            <LanguageToggle />
            <ThemeToggle />
            <ActionIcon variant="subtle" onClick={handleLogout} aria-label={t('logout')}>
              <IconLogout size={19} />
            </ActionIcon>
          </Stack>
        ) : (
          <>
            <Group gap="xs" wrap="nowrap">
            <Select
              aria-label={t('language')}
              value={i18n.language}
              onChange={changeLanguage}
              data={[{ value: 'en', label: 'English' }, { value: 'tr', label: 'Turkce' }]}
              className="min-w-0 flex-1"
            />
              <ThemeToggle />
            </Group>
            <NavLink
              label={t('logout')}
              leftSection={<IconLogout size={19} />}
              onClick={handleLogout}
              className="mt-2 rounded-md"
            />
          </>
        )}
      </div>
    </AppShell.Navbar>
  );
}
