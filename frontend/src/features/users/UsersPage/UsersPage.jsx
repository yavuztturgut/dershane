import { ActionIcon, Alert, Button, Group, Menu, Pagination, Select, Stack, Text, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDebouncedValue } from '@mantine/hooks';
import { IconEdit, IconRestore, IconTrash } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../../../components/ui/PageHeader/PageHeader';
import { EmptyState } from '../../../components/ui/EmptyState/EmptyState';
import { AppModal } from '../../../components/ui/AppModal/AppModal';
import { openAppConfirmModal } from '../../../components/ui/AppModal/open-app-confirm-modal';
import { getErrorMessage } from '../../../shared/api/api-client';
import { notifyError, notifySuccess } from '../../../shared/notifications/notifications';
import { queryClient } from '../../../shared/query/query-client';
import { queryKeys } from '../../../shared/query/query-keys';
import { cachePolicy } from '../../../shared/query/cache-policy';
import { getLookupsQueryOptions, useLookups } from '../../lookups/use-lookups';
import { usersApi } from '../users.api';
import { PageContainer } from '../../../components/layout/PageContainer/PageContainer';
import { ResponsiveFilterPanel } from '../../../components/ui/ResponsiveFilterPanel/ResponsiveFilterPanel';
import { UserFilters } from '../UserFilters/UserFilters';
import { UserForm } from '../UserForm/UserForm';
import { UserList } from '../UserList/UserList';
import { useSuspendingQueries } from '../../../shared/query/use-suspending-queries';
import styles from './UsersPage.module.css';

const initialValues = { role_id: '', class_id: '', name: '', email: '', password: '', status: 1 };

export function UsersPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const modalQueryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchParamValue = searchParams.get('search') || '';
  const [searchInput, setSearchInput] = useState(searchParamValue);
  const [debouncedSearch] = useDebouncedValue(searchInput, 300);
  const [opened, setOpened] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectionMode, setSelectionMode] = useState('ids');
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [excludedIds, setExcludedIds] = useState(() => new Set());
  const [bulkOpened, setBulkOpened] = useState(false);
  const [bulkAction, setBulkAction] = useState(null);
  const [bulkClassId, setBulkClassId] = useState('');
  const [bulkPreview, setBulkPreview] = useState(null);
  const handledDashboardActionKey = useRef(null);
  const lookupsQuery = useLookups();
  const roles = lookupsQuery.data?.roles;
  const classes = lookupsQuery.data?.classes;
  const queryParams = Object.fromEntries(searchParams.entries());
  const selectionKey = JSON.stringify(Object.fromEntries([...searchParams.entries()].filter(([key]) => key !== 'page')));
  const usersQueryOptions = {
    queryKey: queryKeys.users.list(queryParams),
    queryFn: () => usersApi.getPage(queryParams),
    placeholderData: keepPreviousData,
    staleTime: cachePolicy.operational,
  };
  const usersQuery = useQuery(usersQueryOptions);
  const pageData = usersQuery.data;
  const detailQuery = useQuery({ queryKey: queryKeys.users.detail(editingId), queryFn: () => usersApi.getById(editingId), enabled: Boolean(editingId), staleTime: cachePolicy.operational });
  const form = useForm({
    initialValues,
    validate: {
      role_id: (value) => value ? null : t('errors.REQUIRED'),
      class_id: (value, values) => roles?.find((role) => String(role.id) === values.role_id)?.name === 'student' && !value ? t('errors.STUDENT_CLASS_REQUIRED') : null,
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
  useEffect(() => {
    setSelectionMode('ids');
    setSelectedIds(new Set());
    setExcludedIds(new Set());
  }, [selectionKey]);
  useEffect(() => {
    const action = location.state?.dashboardAction;
    if (action?.type !== 'create-user' || !roles) return;
    if (handledDashboardActionKey.current === location.key) return;
    handledDashboardActionKey.current = location.key;
    const role = roles.find((item) => item.name === action.role);
    setEditingId(null);
    setFormValues({ ...initialValues, role_id: role ? String(role.id) : '' });
    setOpened(true);
    navigate({ pathname: location.pathname, search: location.search }, { replace: true, state: null });
  }, [location.key, location.pathname, location.search, location.state, navigate, roles, setFormValues]);

  const saveMutation = useMutation({
    mutationFn: (values) => {
      const payload = { ...values, role_id: Number(values.role_id), class_id: values.class_id ? Number(values.class_id) : null };
      return editingId ? usersApi.update(editingId, payload) : usersApi.create(payload);
    },
    onSuccess: (user) => {
      notifySuccess(t(editingId ? 'updated' : 'created'));
      if (editingId) queryClient.setQueryData(queryKeys.users.detail(editingId), user);
      setOpened(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.allOptions() });
      queryClient.invalidateQueries({ queryKey: queryKeys.lookups.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.summary });
    },
    onError: (error) => notifyError(getErrorMessage(error)),
  });
  const deleteMutation = useMutation({ mutationFn: usersApi.remove, onSuccess: (result, id) => {
    notifySuccess(t('deleted'));
    queryClient.removeQueries({ queryKey: queryKeys.users.detail(id) });
    queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });
    queryClient.invalidateQueries({ queryKey: queryKeys.users.allOptions() });
    queryClient.invalidateQueries({ queryKey: queryKeys.lookups.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.summary });
  }, onError: (error) => notifyError(getErrorMessage(error)) });
  const restoreMutation = useMutation({ mutationFn: usersApi.restore, onSuccess: (result, id) => {
    notifySuccess(t('restored'));
    queryClient.removeQueries({ queryKey: queryKeys.users.detail(id) });
    queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });
    queryClient.invalidateQueries({ queryKey: queryKeys.users.allOptions() });
    queryClient.invalidateQueries({ queryKey: queryKeys.lookups.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.summary });
  }, onError: (error) => notifyError(getErrorMessage(error)) });

  const invalidateUserData = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });
    queryClient.invalidateQueries({ queryKey: queryKeys.users.allOptions() });
    queryClient.invalidateQueries({ queryKey: queryKeys.lookups.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.summary });
  };
  const previewBulkMutation = useMutation({
    mutationFn: (data) => usersApi.previewBulk(data),
    onSuccess: setBulkPreview,
    onError: (error) => notifyError(getErrorMessage(error)),
  });
  const applyBulkMutation = useMutation({
    mutationFn: (data) => usersApi.applyBulk(data),
    onSuccess: (result) => {
      notifySuccess(t('bulkResult', result));
      setBulkOpened(false);
      setSelectionMode('ids');
      setSelectedIds(new Set());
      setExcludedIds(new Set());
      invalidateUserData();
    },
    onError: (error) => notifyError(getErrorMessage(error)),
  });

  const roleName = (id) => roles?.find((role) => role.id === id)?.name || id;
  const className = (id) => classes?.find((item) => item.id === id)?.name || '-';
  const roleOptions = roles?.map((role) => ({ value: String(role.id), label: role.name })) || [];
  const classOptions = classes?.map((item) => ({ value: String(item.id), label: item.name })) || [];
  const setFilter = (key, value) => setSearchParams((current) => { const next = new URLSearchParams(current); if (value) next.set(key, value); else next.delete(key); if (key !== 'page') next.set('page', '1'); return next; });
  const activeFilterCount = ['role_id', 'class_id', 'status', 'sort', 'order'].filter((key) => searchParams.has(key)).length;
  const clearFilters = () => setSearchParams((current) => { const next = new URLSearchParams(); if (current.get('search')) next.set('search', current.get('search')); return next; });

  const isSelected = (id) => selectionMode === 'filter' ? !excludedIds.has(id) : selectedIds.has(id);
  const selectedCount = selectionMode === 'filter' ? Math.max(0, pageData?.total - excludedIds.size) : selectedIds.size;
  const pageIds = (usersQuery.data?.items || []).map((user) => user.id);
  const selectedOnPage = pageIds.filter(isSelected).length;
  const allPageSelected = Boolean(pageIds.length) && selectedOnPage === pageIds.length;
  const pageIndeterminate = selectedOnPage > 0 && !allPageSelected;

  function clearSelection() {
    setSelectionMode('ids');
    setSelectedIds(new Set());
    setExcludedIds(new Set());
  }

  function toggleUser(id) {
    if (selectionMode === 'filter') {
      setExcludedIds((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
      return;
    }
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else if (next.size < 1000) next.add(id);
      else notifyError(t('bulkLimitExceeded'));
      return next;
    });
  }

  function togglePage() {
    if (selectionMode === 'filter') {
      setExcludedIds((current) => {
        const next = new Set(current);
        pageIds.forEach((id) => { if (allPageSelected) next.add(id); else next.delete(id); });
        return next;
      });
      return;
    }
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allPageSelected) pageIds.forEach((id) => next.delete(id));
      else {
        if (new Set([...next, ...pageIds]).size > 1000) { notifyError(t('bulkLimitExceeded')); return current; }
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  function selectAllResults() {
    if (pageData.total > 1000) { notifyError(t('bulkLimitExceeded')); return; }
    setSelectionMode('filter');
    setSelectedIds(new Set());
    setExcludedIds(new Set());
  }

  function bulkSelector() {
    if (selectionMode === 'ids') return { type: 'ids', ids: [...selectedIds] };
    const filters = Object.fromEntries([...searchParams.entries()].filter(([key]) => !['page', 'sort', 'order'].includes(key)));
    return { type: 'filter', filters, excluded_ids: [...excludedIds] };
  }

  function actionPayload(type, classId = bulkClassId) {
    return type === 'assign_class' ? { type, class_id: Number(classId) } : { type };
  }

  function startBulkAction(type) {
    setBulkAction(type);
    setBulkClassId('');
    setBulkPreview(null);
    setBulkOpened(true);
    if (type !== 'assign_class') previewBulkMutation.mutate({ selector: bulkSelector(), action: actionPayload(type) });
  }

  function previewClassAction(value) {
    setBulkClassId(value || '');
    setBulkPreview(null);
    if (value) previewBulkMutation.mutate({ selector: bulkSelector(), action: actionPayload('assign_class', value) });
  }

  function applyBulkAction() {
    applyBulkMutation.mutate({ resolved_ids: bulkPreview.resolved_ids, action: actionPayload(bulkAction) });
  }

  function openCreate() { setEditingId(null); form.setValues(initialValues); setOpened(true); }
  function openEdit(user) {
    modalQueryClient.setQueryData(queryKeys.users.detail(user.id), user);
    form.setValues({ ...user, role_id: String(user.role_id), class_id: user.class_id ? String(user.class_id) : '', password: '' });
    setEditingId(user.id);
    setOpened(true);
  }
  function confirmDelete(user) { openAppConfirmModal({ title: t('confirmDelete', { name: user.name }), children: t('deleteDescription'), labels: { confirm: t('delete'), cancel: t('cancel') }, confirmProps: { color: 'red' }, onConfirm: () => deleteMutation.mutate(user.id) }); }

  useSuspendingQueries([
    { query: usersQuery, options: usersQueryOptions },
    { query: lookupsQuery, options: getLookupsQueryOptions() },
  ]);
  if ((usersQuery.isError && !usersQuery.data) || lookupsQuery.isError) return <Alert color="red">{t('errors.GENERIC')} <Button variant="subtle" onClick={() => usersQuery.refetch()}>{t('retry')}</Button></Alert>;
  const rowActions = (user) => user.status === -1
    ? <ActionIcon color="green" variant="subtle" loading={restoreMutation.isPending && restoreMutation.variables === user.id} onClick={() => restoreMutation.mutate(user.id)} aria-label={t('restore')}><IconRestore size={18} /></ActionIcon>
    : <Group gap="xs" wrap="nowrap"><ActionIcon variant="subtle" onClick={() => openEdit(user)} aria-label={t('edit')}><IconEdit size={18} /></ActionIcon><ActionIcon color="red" variant="subtle" onClick={() => confirmDelete(user)} aria-label={t('delete')}><IconTrash size={18} /></ActionIcon></Group>;
  const filterFields = <UserFilters searchParams={searchParams} setFilter={setFilter} roleOptions={roleOptions} classOptions={classOptions} t={t} />;

  return <PageContainer><PageHeader title={t('users')} description={t('usersDescription')} onCreate={openCreate} createLabel={t('create')} />
    <ResponsiveFilterPanel primary={<TextInput placeholder={t('search')} value={searchInput} onChange={(event) => setSearchInput(event.currentTarget.value)} />} activeCount={activeFilterCount} onClear={clearFilters}>{filterFields}</ResponsiveFilterPanel>
    <div aria-busy={usersQuery.isFetching}>{!pageData.items.length ? <EmptyState message={t('noData')} actionLabel={t('clearFilters')} onAction={activeFilterCount ? clearFilters : undefined} /> : <UserList users={pageData.items} roleName={roleName} className={className} actions={rowActions} isSelected={isSelected} onToggle={toggleUser} allPageSelected={allPageSelected} pageIndeterminate={pageIndeterminate} onTogglePage={togglePage} t={t} />}</div>
    {pageData.totalPages > 1 && <Group justify="center" mt="lg"><Pagination total={pageData.totalPages} value={pageData.page} onChange={(page) => setFilter('page', String(page))} /></Group>}
    {selectedCount > 0 && <><div className={styles.bulkBarSpacer} aria-hidden="true" /><div className={styles.bulkBar}><Group justify="space-between" gap="sm" wrap="wrap"><Group gap="sm" wrap="wrap"><Text fw={600}>{selectionMode === 'filter' ? t('allResultsSelected', { count: selectedCount }) : t('usersSelected', { count: selectedCount })}</Text>{selectionMode === 'ids' && allPageSelected && pageData.total > pageIds.length && <Button variant="subtle" onClick={selectAllResults}>{t('selectAllResults', { count: pageData.total })}</Button>}</Group><Group gap="xs"><Menu shadow="md"><Menu.Target><Button>{t('bulkActions')}</Button></Menu.Target><Menu.Dropdown><Menu.Item onClick={() => startBulkAction('activate')}>{t('bulkActivate')}</Menu.Item><Menu.Item onClick={() => startBulkAction('deactivate')}>{t('bulkDeactivate')}</Menu.Item><Menu.Item onClick={() => startBulkAction('assign_class')}>{t('bulkAssignClass')}</Menu.Item><Menu.Item color="red" onClick={() => startBulkAction('delete')}>{t('bulkDelete')}</Menu.Item><Menu.Item onClick={() => startBulkAction('restore')}>{t('bulkRestore')}</Menu.Item></Menu.Dropdown></Menu><Button variant="subtle" onClick={clearSelection}>{t('clearSelection')}</Button></Group></Group></div></>}
    <AppModal opened={opened} onClose={() => setOpened(false)} title={t(editingId ? 'edit' : 'create')}>{detailQuery.isError ? <Alert color="red">{t('errors.GENERIC')}</Alert> : <UserForm form={form} editingId={editingId} roleOptions={roleOptions} classOptions={classOptions} saving={saveMutation.isPending} onCancel={() => setOpened(false)} onSubmit={(values) => saveMutation.mutate(values)} t={t} />}</AppModal>
    <AppModal opened={bulkOpened} onClose={() => { if (!applyBulkMutation.isPending) setBulkOpened(false); }} title={t(`bulkActionTitles.${bulkAction || 'activate'}`)}><Stack>
      {bulkAction === 'assign_class' && <Select label={t('class')} placeholder={t('selectClass')} data={classOptions} value={bulkClassId || null} disabled={previewBulkMutation.isPending} onChange={previewClassAction} />}
      {previewBulkMutation.isPending && <Text c="dimmed">{t('bulkChecking')}</Text>}
      {bulkPreview && <><Text>{t('bulkSelectedCount', { count: bulkPreview.selected })}</Text><Text c="green">{t('bulkEligibleCount', { count: bulkPreview.eligible })}</Text><Text c="dimmed">{t('bulkSkippedCount', { count: bulkPreview.skipped })}</Text></>}
      <Group justify="flex-end"><Button variant="default" disabled={applyBulkMutation.isPending} onClick={() => setBulkOpened(false)}>{t('cancelBulk')}</Button><Button color={bulkAction === 'delete' ? 'red' : undefined} disabled={!bulkPreview?.eligible} loading={applyBulkMutation.isPending} onClick={applyBulkAction}>{t('applyEligible')}</Button></Group>
    </Stack></AppModal>
  </PageContainer>;
}
