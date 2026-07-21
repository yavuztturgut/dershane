import { NamedEntityPage } from '../../components/ui/NamedEntityPage';
import { coursesApi } from './courses.api';

export function CoursesPage() {
  return <NamedEntityPage api={coursesApi} queryKey="courses" titleKey="courses" />;
}
