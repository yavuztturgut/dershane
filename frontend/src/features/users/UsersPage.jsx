import { ActionIcon, Button, Checkbox, Group, Modal, Select, Table, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../../components/ui/PageHeader';
import { PageLoader } from '../../components/ui/PageLoader';
import { EmptyState } from '../../components/ui/EmptyState';
import { getErrorMessage } from '../../lib/api-client';
import { notifyError } from '../../lib/notifications';
import { queryClient } from '../../lib/query-client';
import { rolesApi } from '../roles/roles.api';
import { classesApi } from '../classes/classes.api';
import { usersApi } from './users.api';

const initialValues = { role_id: '', class_id: '', name: '', email: '', password: '', is_active: true };

export function UsersPage() {
  const { t } = useTranslation();
  const [opened, setOpened] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const form = useForm({
    initialValues,
    validate: {
      role_id: (value) => value ? null : 'Required',
      name: (value) => value.trim() ? null : 'Required',
      email: (value) => /^\S+@\S+\.\S+$/.test(value) ? null : 'Invalid email',
      password: (value) => editingId && !value ? null : value.length >= 6 ? null : 'Minimum 6 characters',
    },
  });
  const usersQuery = useQuery({ queryKey: ['users'], queryFn: usersApi.getAll });
  const rolesQuery = useQuery({ queryKey: ['roles'], queryFn: rolesApi.getAll });
  const classesQuery = useQuery({ queryKey: ['classes'], queryFn: classesApi.getAll });
  const detailQuery = useQuery({ queryKey: ['users', editingId], queryFn: () => usersApi.getById(editingId), enabled: Boolean(editingId) });

  useEffect(() => {
    if (detailQuery.data) {
      form.setValues({ ...detailQuery.data, role_id: String(detailQuery.data.role_id), class_id: detailQuery.data.class_id ? String(detailQuery.data.class_id) : '', password: '' });
    }
  }, [detailQuery.data]);

  const saveMutation = useMutation({
    mutationFn: (values) => {
      const payload = { ...values, role_id: Number(values.role_id), class_id: values.class_id ? Number(values.class_id) : null };
      return editingId ? usersApi.update(editingId, payload) : usersApi.create(payload);
    },
    onSuccess: () => { notifications.show({ color: 'green', message: t(editingId ? 'updated' : 'created') }); setOpened(false); queryClient.invalidateQueries({ queryKey: ['users'] }); },
    onError: (error) => notifyError(getErrorMessage(error)),
  });
  const deleteMutation = useMutation({
    mutationFn: usersApi.remove,
    onSuccess: () => { notifications.show({ color: 'green', message: t('deleted') }); queryClient.invalidateQueries({ queryKey: ['users'] }); },
    onError: (error) => notifyError(getErrorMessage(error)),
  });

  const roleName = (id) => rolesQuery.data?.find((role) => role.id === id)?.name || id;
  const className = (id) => classesQuery.data?.find((item) => item.id === id)?.name || '-';
  const roleOptions = rolesQuery.data?.map((role) => ({ value: String(role.id), label: role.name })) || [];
  const classOptions = classesQuery.data?.map((item) => ({ value: String(item.id), label: item.name })) || [];

  function openCreate() { setEditingId(null); form.setValues(initialValues); setOpened(true); }
  function openEdit(id) { setEditingId(id); setOpened(true); }
  function confirmDelete(user) {
    modals.openConfirmModal({ title: t('confirmDelete', { name: user.name }), children: t('deleteDescription'), labels: { confirm: t('delete'), cancel: t('cancel') }, confirmProps: { color: 'red' }, onConfirm: () => deleteMutation.mutate(user.id) });
  }

  if (usersQuery.isLoading || rolesQuery.isLoading || classesQuery.isLoading) return <PageLoader />;

  return (
    <>
      <PageHeader title={t('users')} onCreate={openCreate} createLabel={t('create')} />
      {!usersQuery.data?.length ? <EmptyState message={t('noData')} /> : <Table.ScrollContainer minWidth={760}><Table highlightOnHover withTableBorder><Table.Thead><Table.Tr><Table.Th>{t('name')}</Table.Th><Table.Th>{t('email')}</Table.Th><Table.Th>{t('role')}</Table.Th><Table.Th>{t('class')}</Table.Th><Table.Th>{t('active')}</Table.Th><Table.Th>{t('actions')}</Table.Th></Table.Tr></Table.Thead><Table.Tbody>{usersQuery.data.map((user) => <Table.Tr key={user.id}><Table.Td>{user.name}</Table.Td><Table.Td>{user.email}</Table.Td><Table.Td>{roleName(user.role_id)}</Table.Td><Table.Td>{className(user.class_id)}</Table.Td><Table.Td>{user.is_active ? 'Yes' : 'No'}</Table.Td><Table.Td><Group gap="xs"><ActionIcon variant="subtle" onClick={() => openEdit(user.id)} aria-label={t('edit')}><IconEdit size={18} /></ActionIcon><ActionIcon color="red" variant="subtle" onClick={() => confirmDelete(user)} aria-label={t('delete')}><IconTrash size={18} /></ActionIcon></Group></Table.Td></Table.Tr>)}</Table.Tbody></Table></Table.ScrollContainer>}
      <Modal opened={opened} onClose={() => setOpened(false)} title={t(editingId ? 'edit' : 'create')} centered>
        {editingId && detailQuery.isLoading ? <PageLoader /> : <form onSubmit={form.onSubmit((values) => saveMutation.mutate(values))}><Select label={t('role')} data={roleOptions} required {...form.getInputProps('role_id')} /><Select label={t('class')} data={classOptions} clearable mt="sm" {...form.getInputProps('class_id')} /><TextInput label={t('name')} required mt="sm" {...form.getInputProps('name')} /><TextInput label={t('email')} required mt="sm" {...form.getInputProps('email')} /><TextInput label={t('password')} required={!editingId} type="password" mt="sm" {...form.getInputProps('password')} /><Checkbox label={t('active')} mt="md" {...form.getInputProps('is_active', { type: 'checkbox' })} /><Group justify="flex-end" mt="lg"><Button variant="default" onClick={() => setOpened(false)}>{t('cancel')}</Button><Button type="submit" loading={saveMutation.isPending}>{t('save')}</Button></Group></form>}
      </Modal>
    </>
  );
}
