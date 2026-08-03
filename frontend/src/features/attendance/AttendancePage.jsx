import { Alert, Group, Pagination, Paper, Select, SimpleGrid, Table, Text, Title } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageLoader } from '../../components/ui/PageLoader';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAuth } from '../auth/use-auth';
import { classesApi } from '../classes/classes.api';
import { usersApi } from '../users/users.api';
import { attendanceApi } from './attendance.api';

function toDate(value) { return value ? (value instanceof Date ? value.toISOString() : String(value)).slice(0, 10) : undefined; }

export function AttendancePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user.role_name === 'admin';
  const [filters, setFilters] = useState({ class_id: '', student_id: '', start: null, end: null });
  const [page, setPage] = useState(1);
  const params = { class_id: filters.class_id || undefined, student_id: filters.student_id || undefined, start: toDate(filters.start), end: toDate(filters.end), page, pageSize: 25 };
  const query = useQuery({ queryKey: ['attendance', isAdmin ? 'report' : 'me', params], queryFn: () => isAdmin ? attendanceApi.getReport(params) : attendanceApi.getMine(params), enabled: ['admin', 'student'].includes(user.role_name) });
  const classesQuery = useQuery({ queryKey: ['classes'], queryFn: classesApi.getAll, enabled: isAdmin });
  const usersQuery = useQuery({ queryKey: ['users', 'attendance-options'], queryFn: usersApi.getAll, enabled: isAdmin });
  const changeFilter = (key, value) => { setFilters((current) => ({ ...current, [key]: value })); setPage(1); };
  if (user.role_name === 'teacher') return <Alert>{t('teacherAttendanceHint')}</Alert>;
  if (query.isLoading || (isAdmin && (classesQuery.isLoading || usersQuery.isLoading))) return <PageLoader />;
  if (query.isError) return <Alert color="red">{t('errors.GENERIC')}</Alert>;
  const records = isAdmin ? query.data.items : query.data.records;
  return <div><Title order={1} className="text-2xl" mb="lg">{t('attendance')}</Title>
    {!isAdmin && <SimpleGrid cols={{ base: 2, sm: 5 }} mb="lg">{['total', 'present', 'absent', 'late', 'excused'].map((key) => <Paper withBorder p="md" key={key}><Text size="xs" c="dimmed">{t(key === 'total' ? 'total' : `attendanceStatus.${key}`)}</Text><Text fw={700} size="xl">{query.data.summary[key]}</Text></Paper>)}</SimpleGrid>}
    <SimpleGrid cols={{ base: 1, sm: isAdmin ? 4 : 2 }} mb="md">{isAdmin && <><Select clearable placeholder={t('class')} data={classesQuery.data.map((item) => ({ value: String(item.id), label: item.name }))} value={filters.class_id} onChange={(value) => changeFilter('class_id', value || '')} /><Select searchable clearable placeholder={t('student')} data={usersQuery.data.filter((item) => item.class_id).map((item) => ({ value: String(item.id), label: item.name }))} value={filters.student_id} onChange={(value) => changeFilter('student_id', value || '')} /></>}<DateInput clearable placeholder={t('start')} value={filters.start} onChange={(start) => changeFilter('start', start)} /><DateInput clearable placeholder={t('end')} value={filters.end} onChange={(end) => changeFilter('end', end)} /></SimpleGrid>
    {!records.length ? <EmptyState message={t('noData')} /> : <Table.ScrollContainer minWidth={700}><Table withTableBorder highlightOnHover><Table.Thead><Table.Tr>{isAdmin && <Table.Th>{t('student')}</Table.Th>}<Table.Th>{t('course')}</Table.Th><Table.Th>{t('class')}</Table.Th><Table.Th>{t('start')}</Table.Th><Table.Th>{t('status')}</Table.Th></Table.Tr></Table.Thead><Table.Tbody>{records.map((record) => <Table.Tr key={`${record.schedule_id}-${record.student_id || user.id}`} >{isAdmin && <Table.Td>{record.student_name}</Table.Td>}<Table.Td>{record.course_name}</Table.Td><Table.Td>{record.class_name}</Table.Td><Table.Td>{new Date(record.start_time).toLocaleString()}</Table.Td><Table.Td>{record.status ? t(`attendanceStatus.${record.status}`) : t('notRecorded')}</Table.Td></Table.Tr>)}</Table.Tbody></Table></Table.ScrollContainer>}
    {isAdmin && query.data.totalPages > 1 && <Group justify="center" mt="lg"><Pagination value={page} total={query.data.totalPages} onChange={setPage} /></Group>}
  </div>;
}
