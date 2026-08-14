import { ActionIcon, Alert, Button, Group, Table, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getErrorMessage } from '../../../shared/api/api-client';
import { notifyError, notifySuccess } from '../../../shared/notifications/notifications';
import { queryClient } from '../../../shared/query/query-client';
import { queryKeys } from '../../../shared/query/query-keys';
import { cachePolicy } from '../../../shared/query/cache-policy';
import { useLookups } from '../../lookups/use-lookups';
import { PageHeader } from '../../../components/ui/PageHeader/PageHeader';
import { EmptyState } from '../../../components/ui/EmptyState/EmptyState';
import { AppModal } from '../../../components/ui/AppModal/AppModal';
import { openAppConfirmModal } from '../../../components/ui/AppModal/open-app-confirm-modal';
import { Surface } from '../../../components/ui/Surface/Surface';
import { RecordCard } from '../../../components/ui/RecordCard/RecordCard';
import { PageContainer } from '../../../components/layout/PageContainer/PageContainer';
import { ResponsiveList } from '../../../components/ui/ResponsiveList/ResponsiveList';
import { PageLoader } from '../../../components/ui/PageLoader/PageLoader';

export function NamedEntityPage({ api, entity, titleKey, readOnly = false }) {
  const { t } = useTranslation();
  const modalQueryClient = useQueryClient();
  const [opened, setOpened] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const saveRequestRef = useRef(false);
  const form = useForm({ initialValues: { name: '' }, validate: { name: (value) => value.trim() ? null : t('errors.REQUIRED') } });
  const setFormValues = form.setValues;
  const lookupsQuery = useLookups();
  const items = lookupsQuery.data?.[entity];
  const detailQuery = useQuery({ queryKey: queryKeys.entities.detail(entity, editingId), queryFn: () => api.getById(editingId), enabled: Boolean(editingId), staleTime: cachePolicy.operational });

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
      notifySuccess(t(editingId ? 'updated' : 'created'));
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
      notifySuccess(t('deleted'));
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

  function openEdit(item) {
    modalQueryClient.setQueryData(queryKeys.entities.detail(entity, item.id), item);
    form.setValues({ name: item.name });
    setEditingId(item.id);
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

  const actions = (item) => readOnly ? t('systemRole') : <Group gap="xs" wrap="nowrap"><ActionIcon variant="subtle" onClick={() => openEdit(item)} aria-label={t('edit')}><IconEdit size={18} /></ActionIcon><ActionIcon color="red" variant="subtle" onClick={() => confirmDelete(item)} aria-label={t('delete')}><IconTrash size={18} /></ActionIcon></Group>;

  return (
    <PageContainer>
      <PageHeader title={t(titleKey)} description={t('definitionsDescription')} onCreate={readOnly ? undefined : openCreate} createLabel={t('create')} />
      {lookupsQuery.isLoading ? <PageLoader /> : lookupsQuery.isError ? <Alert color="red">{t('errors.GENERIC')} <Button variant="subtle" size="compact-sm" onClick={() => lookupsQuery.refetch()}>{t('retry')}</Button></Alert> : !items?.length ? <EmptyState message={t('noData')} actionLabel={t('create')} onAction={readOnly ? undefined : openCreate} /> : (<>
        <ResponsiveList desktop={<Surface>
          <Table highlightOnHover>
            <Table.Thead><Table.Tr><Table.Th>{t('name')}</Table.Th><Table.Th className="w-28">{t('actions')}</Table.Th></Table.Tr></Table.Thead>
            <Table.Tbody>{items.map((item) => (
              <Table.Tr key={item.id}>
                <Table.Td>{item.name}</Table.Td>
                <Table.Td>{actions(item)}</Table.Td>
              </Table.Tr>
            ))}</Table.Tbody>
          </Table>
        </Surface>} mobile={items.map((item) => <RecordCard key={item.id} title={item.name} actions={actions(item)} />)} /></>)}
      {!readOnly && <AppModal opened={opened} onClose={() => setOpened(false)} title={t(editingId ? 'edit' : 'create')}>
        <form onSubmit={form.onSubmit(saveEntity)}>
          <TextInput label={t('name')} required {...form.getInputProps('name')} />
          <Group justify="flex-end" mt="lg"><Button variant="default" onClick={() => setOpened(false)}>{t('cancel')}</Button><Button type="submit" loading={saveMutation.isPending}>{t('save')}</Button></Group>
        </form>
      </AppModal>}
    </PageContainer>
  );
}
