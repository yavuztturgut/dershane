import { Alert, Badge, SimpleGrid, Table } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { EmptyState } from '../../../components/ui/EmptyState/EmptyState';
import { RecordCard } from '../../../components/ui/RecordCard/RecordCard';
import { ResponsiveFilterPanel } from '../../../components/ui/ResponsiveFilterPanel/ResponsiveFilterPanel';
import { ResponsiveList } from '../../../components/ui/ResponsiveList/ResponsiveList';
import { Surface } from '../../../components/ui/Surface/Surface';
import { StatCard } from '../../../components/ui/StatCard/StatCard';
import { formatIstanbulDateTime } from '../../../shared/time/istanbul-date-time';
import { PageLoader } from '../../../components/ui/PageLoader/PageLoader';

const colors = { present: 'green', absent: 'red', late: 'orange', excused: 'pink', not_recorded: 'gray' };

export function PersonalAttendance({ query, filters, changeFilter, clearFilters, t, locale }) {
  if (query.isLoading && !query.data) return <PageLoader />;
  if (query.isError && !query.data) return <Alert color="red">{t('errors.GENERIC')}</Alert>;
  const badge = (record) => <Badge color={colors[record.status] || 'gray'}>{record.status ? t(`attendanceStatus.${record.status}`) : t('notRecorded')}</Badge>;
  return <div aria-busy={query.isFetching}>
    <SimpleGrid cols={{ base: 2, sm: 5 }} mb="lg">{['total', 'present', 'absent', 'late', 'excused'].map((key) => <StatCard key={key} label={t(key === 'total' ? 'total' : `attendanceStatus.${key}`)} value={query.data.summary[key]} color={colors[key] || 'blue'} />)}</SimpleGrid>
    <ResponsiveFilterPanel activeCount={[filters.start, filters.end].filter(Boolean).length} onClear={clearFilters}><SimpleGrid cols={{ base: 1, sm: 2 }}><DateInput clearable placeholder={t('start')} value={filters.start} onChange={(start) => changeFilter('start', start)} /><DateInput clearable placeholder={t('end')} value={filters.end} onChange={(end) => changeFilter('end', end)} /></SimpleGrid></ResponsiveFilterPanel>
    {!query.data.records.length ? <EmptyState message={t('noData')} /> : <ResponsiveList desktop={<Surface><Table highlightOnHover><Table.Thead><Table.Tr><Table.Th>{t('course')}</Table.Th><Table.Th>{t('class')}</Table.Th><Table.Th>{t('start')}</Table.Th><Table.Th>{t('status')}</Table.Th></Table.Tr></Table.Thead><Table.Tbody>{query.data.records.map((record) => <Table.Tr key={record.schedule_id}><Table.Td>{record.course_name}</Table.Td><Table.Td>{record.class_name}</Table.Td><Table.Td>{formatIstanbulDateTime(record.start_time, locale)}</Table.Td><Table.Td>{badge(record)}</Table.Td></Table.Tr>)}</Table.Tbody></Table></Surface>} mobile={query.data.records.map((record) => <RecordCard key={record.schedule_id} title={record.course_name} subtitle={formatIstanbulDateTime(record.start_time, locale)} fields={[{ label: t('class'), value: record.class_name }, { label: t('status'), value: badge(record) }]} />)} />}
  </div>;
}
