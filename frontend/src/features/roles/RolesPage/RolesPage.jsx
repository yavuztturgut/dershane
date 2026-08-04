import { NamedEntityPage } from '../../definitions/NamedEntityPage/NamedEntityPage';
import { rolesApi } from '../roles.api';

export function RolesPage() {
  return <NamedEntityPage api={rolesApi} entity="roles" titleKey="roles" readOnly />;
}
