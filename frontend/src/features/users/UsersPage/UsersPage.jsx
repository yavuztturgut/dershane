import { ActionIcon, Alert, Button, Group, Pagination, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDebouncedValue } from '@mantine/hooks';
import { IconEdit, IconTrash } from '@tabler/icons-react';
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

const initialValues = { role_id: '', class_id: '', name: '', email: '', password: '', is_active: true };

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
  const handledDashboardActionKey = useRef(null);
  const lookupsQuery = useLookups();
  const roles = lookupsQuery.data?.roles;
  const classes = lookupsQuery.data?.classes;
  const queryParams = Object.fromEntries(searchParams.entries());
  const usersQueryOptions = {
    queryKey: queryKeys.users.list(queryParams),
    queryFn: () => usersApi.getPage(queryParams),
    placeholderData: keepPreviousData,
    staleTime: cachePolicy.operational,
  };
  const usersQuery = useQuery(usersQueryOptions);
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
    notifySuccess(t(result?.action === 'deactivated' ? 'deactivated' : 'deleted'));
    queryClient.removeQueries({ queryKey: queryKeys.users.detail(id) });
    queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });
    queryClient.invalidateQueries({ queryKey: queryKeys.users.allOptions() });
    queryClient.invalidateQueries({ queryKey: queryKeys.lookups.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.summary });
  }, onError: (error) => notifyError(getErrorMessage(error)) });

  const roleName = (id) => roles?.find((role) => role.id === id)?.name || id;
  const className = (id) => classes?.find((item) => item.id === id)?.name || '-';
  const roleOptions = roles?.map((role) => ({ value: String(role.id), label: role.name })) || [];
  const classOptions = classes?.map((item) => ({ value: String(item.id), label: item.name })) || [];
  const setFilter = (key, value) => setSearchParams((current) => { const next = new URLSearchParams(current); if (value) next.set(key, value); else next.delete(key); if (key !== 'page') next.set('page', '1'); return next; });
  const activeFilterCount = ['role_id', 'class_id', 'is_active', 'sort', 'order'].filter((key) => searchParams.has(key)).length;
  const clearFilters = () => setSearchParams((current) => { const next = new URLSearchParams(); if (current.get('search')) next.set('search', current.get('search')); return next; });

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
  const pageData = usersQuery.data;

  const rowActions = (user) => <Group gap="xs" wrap="nowrap"><ActionIcon variant="subtle" onClick={() => openEdit(user)} aria-label={t('edit')}><IconEdit size={18} /></ActionIcon><ActionIcon color="red" variant="subtle" onClick={() => confirmDelete(user)} aria-label={t('delete')}><IconTrash size={18} /></ActionIcon></Group>;
  const filterFields = <UserFilters searchParams={searchParams} setFilter={setFilter} roleOptions={roleOptions} classOptions={classOptions} t={t} />;

  return <PageContainer><PageHeader title={t('users')} description={t('usersDescription')} onCreate={openCreate} createLabel={t('create')} />
    <ResponsiveFilterPanel primary={<TextInput placeholder={t('search')} value={searchInput} onChange={(event) => setSearchInput(event.currentTarget.value)} />} activeCount={activeFilterCount} onClear={clearFilters}>{filterFields}</ResponsiveFilterPanel>
    <div aria-busy={usersQuery.isFetching}>{!pageData.items.length ? <EmptyState message={t('noData')} actionLabel={t('clearFilters')} onAction={activeFilterCount ? clearFilters : undefined} /> : <UserList users={pageData.items} roleName={roleName} className={className} actions={rowActions} t={t} />}</div>
    {pageData.totalPages > 1 && <Group justify="center" mt="lg"><Pagination total={pageData.totalPages} value={pageData.page} onChange={(page) => setFilter('page', String(page))} /></Group>}
    <AppModal opened={opened} onClose={() => setOpened(false)} title={t(editingId ? 'edit' : 'create')}>{detailQuery.isError ? <Alert color="red">{t('errors.GENERIC')}</Alert> : <UserForm form={form} editingId={editingId} roleOptions={roleOptions} classOptions={classOptions} saving={saveMutation.isPending} onCancel={() => setOpened(false)} onSubmit={(values) => saveMutation.mutate(values)} t={t} />}</AppModal>
  </PageContainer>;
}
