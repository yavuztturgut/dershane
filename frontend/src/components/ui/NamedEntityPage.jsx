import { ActionIcon, Alert, Button, Group, Table, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getErrorMessage } from '../../lib/api-client';
import { notifyError } from '../../lib/notifications';
import { queryClient } from '../../lib/query-client';
import { queryKeys } from '../../lib/query-keys';
import { useLookups } from '../../features/lookups/use-lookups';
import { PageHeader } from './PageHeader';
import { PageLoader } from './PageLoader';
import { EmptyState } from './EmptyState';
import { AppModal } from './AppModal';
import { openAppConfirmModal } from './app-confirm-modal';

export function NamedEntityPage({ api, entity, titleKey, readOnly = false }) {
  const { t } = useTranslation();
  const [opened, setOpened] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const saveRequestRef = useRef(false);
  const form = useForm({ initialValues: { name: '' }, validate: { name: (value) => value.trim() ? null : t('errors.REQUIRED') } });
  const setFormValues = form.setValues;
  const lookupsQuery = useLookups();
  const items = lookupsQuery.data?.[entity];
  const detailQuery = useQuery({ queryKey: queryKeys.entities.detail(entity, editingId), queryFn: () => api.getById(editingId), enabled: Boolean(editingId) });

  useEffect(() => {
    if (detailQuery.data) setFormValues({ name: detailQuery.data.name });
  }, [detailQuery.data, setFormValues]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.lookups.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.summary });
    if (entity === 'classes' || entity === 'courses') {
      queryClient.invalidateQueries({ queryKey: queryKeys.schedules.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.reports() });
    }
  };
  const saveMutation = useMutation({
    mutationFn: (values) => editingId ? api.update(editingId, values) : api.create(values),
    onSuccess: (result) => {
      notifications.show({ color: 'green', message: t(editingId ? 'updated' : 'created') });
      if (editingId) queryClient.setQueryData(queryKeys.entities.detail(entity, editingId), result);
      setOpened(false);
      invalidate();
    },
    onError: (error) => notifyError(getErrorMessage(error)),
    onSettled: () => { saveRequestRef.current = false; },
  });
  const deleteMutation = useMutation({
    mutationFn: api.remove,
    onSuccess: (_, id) => {
      notifications.show({ color: 'green', message: t('deleted') });
      queryClient.removeQueries({ queryKey: queryKeys.entities.detail(entity, id) });
      invalidate();
    },
    onError: (error) => notifyError(getErrorMessage(error)),
  });

  function openCreate() {
    setEditingId(null);
    form.reset();
    setOpened(true);
  }

  function openEdit(id) {
    setEditingId(id);
    setOpened(true);
  }

  function saveEntity(values) {
    if (saveRequestRef.current) return;
    saveRequestRef.current = true;
    saveMutation.mutate({ ...values, name: values.name.trim() });
  }

  function confirmDelete(item) {
    openAppConfirmModal({
      title: t('confirmDelete', { name: item.name }),
      children: t('deleteDescription'),
      labels: { confirm: t('delete'), cancel: t('cancel') },
      confirmProps: { color: 'red', loading: deleteMutation.isPending },
      onConfirm: () => deleteMutation.mutate(item.id),
    });
  }

  if (lookupsQuery.isLoading) return <PageLoader />;
  if (lookupsQuery.isError) return <Alert color="red">{t('errors.GENERIC')} <Button variant="subtle" size="compact-sm" onClick={() => lookupsQuery.refetch()}>{t('retry')}</Button></Alert>;

  return (
    <>
      <PageHeader title={t(titleKey)} onCreate={readOnly ? undefined : openCreate} createLabel={t('create')} />
      {!items?.length ? <EmptyState message={t('noData')} /> : (
        <Table.ScrollContainer minWidth={480}>
          <Table highlightOnHover withTableBorder>
            <Table.Thead><Table.Tr><Table.Th>{t('name')}</Table.Th><Table.Th className="w-28">{t('actions')}</Table.Th></Table.Tr></Table.Thead>
            <Table.Tbody>{items.map((item) => (
              <Table.Tr key={item.id}>
                <Table.Td>{item.name}</Table.Td>
                <Table.Td>{readOnly ? t('systemRole') : <Group gap="xs"><ActionIcon variant="subtle" onClick={() => openEdit(item.id)} aria-label={t('edit')}><IconEdit size={18} /></ActionIcon><ActionIcon color="red" variant="subtle" onClick={() => confirmDelete(item)} aria-label={t('delete')}><IconTrash size={18} /></ActionIcon></Group>}</Table.Td>
              </Table.Tr>
            ))}</Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
      {!readOnly && <AppModal opened={opened} onClose={() => setOpened(false)} title={t(editingId ? 'edit' : 'create')}>
        {editingId && detailQuery.isLoading ? <PageLoader /> : (
          <form onSubmit={form.onSubmit(saveEntity)}>
            <TextInput label={t('name')} required {...form.getInputProps('name')} />
            <Group justify="flex-end" mt="lg"><Button variant="default" onClick={() => setOpened(false)}>{t('cancel')}</Button><Button type="submit" loading={saveMutation.isPending}>{t('save')}</Button></Group>
          </form>
        )}
      </AppModal>}
    </>
  );
}
