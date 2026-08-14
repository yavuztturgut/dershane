import { Badge, Checkbox, Group, Table } from '@mantine/core';
import { RecordCard } from '../../../components/ui/RecordCard/RecordCard';
import { ResponsiveList } from '../../../components/ui/ResponsiveList/ResponsiveList';
import { Surface } from '../../../components/ui/Surface/Surface';

export function UserList({ users, roleName, className, actions, isSelected, onToggle, allPageSelected, pageIndeterminate, onTogglePage, t }) {
  const status = (user) => <Badge color={user.status === 1 ? 'green' : user.status === -1 ? 'red' : 'gray'} variant="light">{t(user.status === 1 ? 'activeUsers' : user.status === -1 ? 'deletedUsers' : 'inactiveUsers')}</Badge>;
  return <ResponsiveList
    desktop={<Surface><Table highlightOnHover><Table.Thead><Table.Tr><Table.Th w={44}><Checkbox aria-label={t('selectPage')} checked={allPageSelected} indeterminate={pageIndeterminate} onChange={onTogglePage} /></Table.Th><Table.Th>{t('name')}</Table.Th><Table.Th>{t('email')}</Table.Th><Table.Th>{t('role')}</Table.Th><Table.Th>{t('class')}</Table.Th><Table.Th>{t('active')}</Table.Th><Table.Th>{t('actions')}</Table.Th></Table.Tr></Table.Thead><Table.Tbody>{users.map((user) => <Table.Tr key={user.id}><Table.Td><Checkbox aria-label={t('selectUser', { name: user.name })} checked={isSelected(user.id)} onChange={() => onToggle(user.id)} /></Table.Td><Table.Td>{user.name}</Table.Td><Table.Td>{user.email}</Table.Td><Table.Td>{roleName(user.role_id)}</Table.Td><Table.Td>{className(user.class_id)}</Table.Td><Table.Td>{status(user)}</Table.Td><Table.Td>{actions(user)}</Table.Td></Table.Tr>)}</Table.Tbody></Table></Surface>}
    mobile={<><Surface p="sm"><Checkbox label={t('selectPage')} checked={allPageSelected} indeterminate={pageIndeterminate} onChange={onTogglePage} /></Surface>{users.map((user) => <RecordCard key={user.id} title={user.name} subtitle={user.email} actions={<Group gap="xs" wrap="nowrap"><Checkbox aria-label={t('selectUser', { name: user.name })} checked={isSelected(user.id)} onChange={() => onToggle(user.id)} />{actions(user)}</Group>} fields={[{ label: t('role'), value: roleName(user.role_id) }, { label: t('class'), value: className(user.class_id) }, { label: t('active'), value: status(user) }]} />)}</>}
  />;
}
