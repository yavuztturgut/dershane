import { Select } from '@mantine/core';
import styles from './UserFilters.module.css';

export function UserFilters({ searchParams, setFilter, roleOptions, classOptions, t }) {
  return <div className={styles.filters}>
    <Select clearable placeholder={t('role')} data={roleOptions} value={searchParams.get('role_id')} onChange={(value) => setFilter('role_id', value)} />
    <Select clearable placeholder={t('class')} data={classOptions} value={searchParams.get('class_id')} onChange={(value) => setFilter('class_id', value)} />
    <Select clearable placeholder={t('active')} data={[{ value: 'true', label: t('yes') }, { value: 'false', label: t('no') }]} value={searchParams.get('is_active')} onChange={(value) => setFilter('is_active', value)} />
    <Select placeholder={t('sort')} data={[{ value: 'id', label: t('createdOrder') }, { value: 'name', label: t('name') }, { value: 'email', label: t('email') }]} value={searchParams.get('sort') || 'id'} onChange={(value) => setFilter('sort', value)} />
    <Select data={[{ value: 'asc', label: t('ascending') }, { value: 'desc', label: t('descending') }]} value={searchParams.get('order') || 'asc'} onChange={(value) => setFilter('order', value)} />
  </div>;
}
