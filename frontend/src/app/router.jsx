import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { LoginPage } from '../features/auth/LoginPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { UsersPage } from '../features/users/UsersPage';
import { RolesPage } from '../features/roles/RolesPage';
import { ClassesPage } from '../features/classes/ClassesPage';
import { CoursesPage } from '../features/courses/CoursesPage';
import { SchedulesPage } from '../features/schedules/SchedulesPage';
import { ProfilePage } from '../features/profile/ProfilePage';
import { ProtectedRoute, RoleRoute } from './route-guards';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route element={<RoleRoute roles={['admin']} />}>
              <Route index element={<DashboardPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="roles" element={<RolesPage />} />
              <Route path="classes" element={<ClassesPage />} />
              <Route path="courses" element={<CoursesPage />} />
            </Route>
            <Route path="schedules" element={<SchedulesPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
