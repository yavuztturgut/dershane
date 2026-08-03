import { NamedEntityPage } from '../../components/ui/NamedEntityPage';
import { rolesApi } from './roles.api';

export function RolesPage() {
  return <NamedEntityPage api={rolesApi} queryKey="roles" titleKey="roles" readOnly />;
}
