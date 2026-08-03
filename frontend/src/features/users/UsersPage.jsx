import { ActionIcon, Alert, Button, Checkbox, Group, Pagination, Select, SimpleGrid, Table, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDebouncedValue } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../../components/ui/PageHeader';
import { PageLoader } from '../../components/ui/PageLoader';
import { EmptyState } from '../../components/ui/EmptyState';
import { AppModal } from '../../components/ui/AppModal';
import { openAppConfirmModal } from '../../components/ui/app-confirm-modal';
import { getErrorMessage } from '../../lib/api-client';
import { notifyError } from '../../lib/notifications';
import { queryClient } from '../../lib/query-client';
import { rolesApi } from '../roles/roles.api';
import { classesApi } from '../classes/classes.api';
import { usersApi } from './users.api';

const initialValues = { role_id: '', class_id: '', name: '', email: '', password: '', is_active: true };

export function UsersPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchParamValue = searchParams.get('search') || '';
  const [searchInput, setSearchInput] = useState(searchParamValue);
  const [debouncedSearch] = useDebouncedValue(searchInput, 300);
  const [opened, setOpened] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const rolesQuery = useQuery({ queryKey: ['roles'], queryFn: rolesApi.getAll });
  const classesQuery = useQuery({ queryKey: ['classes'], queryFn: classesApi.getAll });
  const queryParams = Object.fromEntries(searchParams.entries());
  const usersQuery = useQuery({ queryKey: ['users', queryParams], queryFn: () => usersApi.getPage(queryParams) });
  const detailQuery = useQuery({ queryKey: ['users', editingId], queryFn: () => usersApi.getById(editingId), enabled: Boolean(editingId) });
  const form = useForm({
    initialValues,
    validate: {
      role_id: (value) => value ? null : t('errors.REQUIRED'),
      class_id: (value, values) => rolesQuery.data?.find((role) => String(role.id) === values.role_id)?.name === 'student' && !value ? t('errors.STUDENT_CLASS_REQUIRED') : null,
      name: (value) => value.trim() ? null : t('errors.REQUIRED'),
      email: (value) => /^\S+@\S+\.\S+$/.test(value) ? null : t('errors.INVALID_EMAIL'),
      password: (value) => editingId && !value ? null : value.length >= 8 ? null : t('errors.PASSWORD_TOO_SHORT'),
    },
  });
  const setFormValues = form.setValues;

  useEffect(() => {
    if (detailQuery.data) setFormValues({ ...detailQuery.data, role_id: String(detailQuery.data.role_id), class_id: detailQuery.data.class_id ? String(detailQuery.data.class_id) : '', password: '' });
  }, [detailQuery.data, setFormValues]);
  useEffect(() => {
    if (debouncedSearch === searchParamValue) return;
    setSearchParams((current) => { const next = new URLSearchParams(current); if (debouncedSearch) next.set('search', debouncedSearch); else next.delete('search'); next.set('page', '1'); return next; });
  }, [debouncedSearch, searchParamValue, setSearchParams]);
  useEffect(() => { setSearchInput(searchParamValue); }, [searchParamValue]);

  const saveMutation = useMutation({
    mutationFn: (values) => {
      const payload = { ...values, role_id: Number(values.role_id), class_id: values.class_id ? Number(values.class_id) : null };
      return editingId ? usersApi.update(editingId, payload) : usersApi.create(payload);
    },
    onSuccess: () => { notifications.show({ color: 'green', message: t(editingId ? 'updated' : 'created') }); setOpened(false); queryClient.invalidateQueries({ queryKey: ['users'] }); },
    onError: (error) => notifyError(getErrorMessage(error)),
  });
  const deleteMutation = useMutation({ mutationFn: usersApi.remove, onSuccess: () => { notifications.show({ color: 'green', message: t('deleted') }); queryClient.invalidateQueries({ queryKey: ['users'] }); }, onError: (error) => notifyError(getErrorMessage(error)) });

  const roleName = (id) => rolesQuery.data?.find((role) => role.id === id)?.name || id;
  const className = (id) => classesQuery.data?.find((item) => item.id === id)?.name || '-';
  const roleOptions = rolesQuery.data?.map((role) => ({ value: String(role.id), label: role.name })) || [];
  const classOptions = classesQuery.data?.map((item) => ({ value: String(item.id), label: item.name })) || [];
  const setFilter = (key, value) => setSearchParams((current) => { const next = new URLSearchParams(current); if (value) next.set(key, value); else next.delete(key); if (key !== 'page') next.set('page', '1'); return next; });

  function openCreate() { setEditingId(null); form.setValues(initialValues); setOpened(true); }
  function openEdit(id) { setEditingId(id); setOpened(true); }
  function confirmDelete(user) { openAppConfirmModal({ title: t('confirmDelete', { name: user.name }), children: t('deleteDescription'), labels: { confirm: t('delete'), cancel: t('cancel') }, confirmProps: { color: 'red' }, onConfirm: () => deleteMutation.mutate(user.id) }); }

  if (usersQuery.isLoading || rolesQuery.isLoading || classesQuery.isLoading) return <PageLoader />;
  if (usersQuery.isError || rolesQuery.isError || classesQuery.isError) return <Alert color="red">{t('errors.GENERIC')} <Button variant="subtle" onClick={() => usersQuery.refetch()}>{t('retry')}</Button></Alert>;
  const pageData = usersQuery.data;

  return <><PageHeader title={t('users')} onCreate={openCreate} createLabel={t('create')} />
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 6 }} mb="md"><TextInput placeholder={t('search')} value={searchInput} onChange={(event) => setSearchInput(event.currentTarget.value)} /><Select clearable placeholder={t('role')} data={roleOptions} value={searchParams.get('role_id')} onChange={(value) => setFilter('role_id', value)} /><Select clearable placeholder={t('class')} data={classOptions} value={searchParams.get('class_id')} onChange={(value) => setFilter('class_id', value)} /><Select clearable placeholder={t('active')} data={[{ value: 'true', label: t('yes') }, { value: 'false', label: t('no') }]} value={searchParams.get('is_active')} onChange={(value) => setFilter('is_active', value)} /><Select placeholder={t('sort')} data={[{ value: 'id', label: t('createdOrder') }, { value: 'name', label: t('name') }, { value: 'email', label: t('email') }]} value={searchParams.get('sort') || 'id'} onChange={(value) => setFilter('sort', value)} /><Select data={[{ value: 'asc', label: t('ascending') }, { value: 'desc', label: t('descending') }]} value={searchParams.get('order') || 'asc'} onChange={(value) => setFilter('order', value)} /></SimpleGrid>
    {!pageData.items.length ? <EmptyState message={t('noData')} /> : <Table.ScrollContainer minWidth={760}><Table highlightOnHover withTableBorder><Table.Thead><Table.Tr><Table.Th>{t('name')}</Table.Th><Table.Th>{t('email')}</Table.Th><Table.Th>{t('role')}</Table.Th><Table.Th>{t('class')}</Table.Th><Table.Th>{t('active')}</Table.Th><Table.Th>{t('actions')}</Table.Th></Table.Tr></Table.Thead><Table.Tbody>{pageData.items.map((user) => <Table.Tr key={user.id}><Table.Td>{user.name}</Table.Td><Table.Td>{user.email}</Table.Td><Table.Td>{roleName(user.role_id)}</Table.Td><Table.Td>{className(user.class_id)}</Table.Td><Table.Td>{t(user.is_active ? 'yes' : 'no')}</Table.Td><Table.Td><Group gap="xs"><ActionIcon variant="subtle" onClick={() => openEdit(user.id)} aria-label={t('edit')}><IconEdit size={18} /></ActionIcon><ActionIcon color="red" variant="subtle" onClick={() => confirmDelete(user)} aria-label={t('delete')}><IconTrash size={18} /></ActionIcon></Group></Table.Td></Table.Tr>)}</Table.Tbody></Table></Table.ScrollContainer>}
    {pageData.totalPages > 1 && <Group justify="center" mt="lg"><Pagination total={pageData.totalPages} value={pageData.page} onChange={(page) => setFilter('page', String(page))} /></Group>}
    <AppModal opened={opened} onClose={() => setOpened(false)} title={t(editingId ? 'edit' : 'create')}>{editingId && detailQuery.isLoading ? <PageLoader /> : detailQuery.isError ? <Alert color="red">{t('errors.GENERIC')}</Alert> : <form onSubmit={form.onSubmit((values) => saveMutation.mutate(values))}><SimpleGrid cols={{ base: 1, sm: 2 }}><Select label={t('role')} data={roleOptions} required {...form.getInputProps('role_id')} /><Select label={t('class')} data={classOptions} clearable {...form.getInputProps('class_id')} /></SimpleGrid><TextInput label={t('name')} required mt="sm" {...form.getInputProps('name')} /><TextInput label={t('email')} required mt="sm" {...form.getInputProps('email')} /><TextInput label={t('password')} required={!editingId} type="password" mt="sm" {...form.getInputProps('password')} /><Checkbox label={t('active')} mt="md" {...form.getInputProps('is_active', { type: 'checkbox' })} /><Group justify="flex-end" mt="lg"><Button variant="default" onClick={() => setOpened(false)}>{t('cancel')}</Button><Button type="submit" loading={saveMutation.isPending}>{t('save')}</Button></Group></form>}</AppModal>
  </>;
}
