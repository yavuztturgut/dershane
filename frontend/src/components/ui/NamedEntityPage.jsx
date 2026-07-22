import { ActionIcon, Button, Group, Modal, Table, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getErrorMessage } from '../../lib/api-client';
import { notifyError } from '../../lib/notifications';
import { queryClient } from '../../lib/query-client';
import { PageHeader } from './PageHeader';
import { PageLoader } from './PageLoader';
import { EmptyState } from './EmptyState';

export function NamedEntityPage({ api, queryKey, titleKey }) {
  const { t } = useTranslation();
  const [opened, setOpened] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const saveRequestRef = useRef(false);
  const form = useForm({ initialValues: { name: '' }, validate: { name: (value) => value.trim() ? null : t('errors.REQUIRED') } });
  const listQuery = useQuery({ queryKey: [queryKey], queryFn: api.getAll });
  const detailQuery = useQuery({ queryKey: [queryKey, editingId], queryFn: () => api.getById(editingId), enabled: Boolean(editingId) });

  useEffect(() => {
    if (detailQuery.data) form.setValues({ name: detailQuery.data.name });
  }, [detailQuery.data]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: [queryKey] });
  const saveMutation = useMutation({
    mutationFn: (values) => editingId ? api.update(editingId, values) : api.create(values),
    onSuccess: () => {
      notifications.show({ color: 'green', message: t(editingId ? 'updated' : 'created') });
      setOpened(false);
      invalidate();
    },
    onError: (error) => notifyError(getErrorMessage(error)),
    onSettled: () => { saveRequestRef.current = false; },
  });
  const deleteMutation = useMutation({
    mutationFn: api.remove,
    onSuccess: () => { notifications.show({ color: 'green', message: t('deleted') }); invalidate(); },
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
    modals.openConfirmModal({
      title: t('confirmDelete', { name: item.name }),
      children: t('deleteDescription'),
      labels: { confirm: t('delete'), cancel: t('cancel') },
      confirmProps: { color: 'red', loading: deleteMutation.isPending },
      onConfirm: () => deleteMutation.mutate(item.id),
    });
  }

  if (listQuery.isLoading) return <PageLoader />;

  return (
    <>
      <PageHeader title={t(titleKey)} onCreate={openCreate} createLabel={t('create')} />
      {!listQuery.data?.length ? <EmptyState message={t('noData')} /> : (
        <Table.ScrollContainer minWidth={480}>
          <Table highlightOnHover withTableBorder>
            <Table.Thead><Table.Tr><Table.Th>{t('name')}</Table.Th><Table.Th className="w-28">{t('actions')}</Table.Th></Table.Tr></Table.Thead>
            <Table.Tbody>{listQuery.data.map((item) => (
              <Table.Tr key={item.id}>
                <Table.Td>{item.name}</Table.Td>
                <Table.Td><Group gap="xs"><ActionIcon variant="subtle" onClick={() => openEdit(item.id)} aria-label={t('edit')}><IconEdit size={18} /></ActionIcon><ActionIcon color="red" variant="subtle" onClick={() => confirmDelete(item)} aria-label={t('delete')}><IconTrash size={18} /></ActionIcon></Group></Table.Td>
              </Table.Tr>
            ))}</Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
      <Modal opened={opened} onClose={() => setOpened(false)} title={t(editingId ? 'edit' : 'create')} fullScreen={false} centered>
        {editingId && detailQuery.isLoading ? <PageLoader /> : (
          <form onSubmit={form.onSubmit(saveEntity)}>
            <TextInput label={t('name')} required {...form.getInputProps('name')} />
            <Group justify="flex-end" mt="lg"><Button variant="default" onClick={() => setOpened(false)}>{t('cancel')}</Button><Button type="submit" loading={saveMutation.isPending}>{t('save')}</Button></Group>
          </form>
        )}
      </Modal>
    </>
  );
}
