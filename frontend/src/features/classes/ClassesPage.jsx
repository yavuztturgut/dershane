import { NamedEntityPage } from '../../components/ui/NamedEntityPage';
import { classesApi } from './classes.api';

export function ClassesPage() {
  return <NamedEntityPage api={classesApi} entity="classes" titleKey="classes" />;
}
