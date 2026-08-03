import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { PageLoader } from '../components/ui/PageLoader';
import { ProtectedRoute, RoleRoute } from './route-guards';

const lazyPage = (loader, name) => lazy(() => loader().then((module) => ({ default: module[name] })));
const LoginPage = lazyPage(() => import('../features/auth/LoginPage'), 'LoginPage');
const ForgotPasswordPage = lazyPage(() => import('../features/auth/ForgotPasswordPage'), 'ForgotPasswordPage');
const ResetPasswordPage = lazyPage(() => import('../features/auth/ResetPasswordPage'), 'ResetPasswordPage');
const DashboardPage = lazyPage(() => import('../features/dashboard/DashboardPage'), 'DashboardPage');
const UsersPage = lazyPage(() => import('../features/users/UsersPage'), 'UsersPage');
const RolesPage = lazyPage(() => import('../features/roles/RolesPage'), 'RolesPage');
const ClassesPage = lazyPage(() => import('../features/classes/ClassesPage'), 'ClassesPage');
const CoursesPage = lazyPage(() => import('../features/courses/CoursesPage'), 'CoursesPage');
const SchedulesPage = lazyPage(() => import('../features/schedules/SchedulesPage'), 'SchedulesPage');
const ProfilePage = lazyPage(() => import('../features/profile/ProfilePage'), 'ProfilePage');
const AttendancePage = lazyPage(() => import('../features/attendance/AttendancePage'), 'AttendancePage');

export function AppRouter() {
  return <BrowserRouter><Suspense fallback={<PageLoader fullPage />}><Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
    <Route path="/reset-password" element={<ResetPasswordPage />} />
    <Route element={<ProtectedRoute />}><Route element={<AppLayout />}>
      <Route element={<RoleRoute roles={['admin']} />}><Route index element={<DashboardPage />} /><Route path="users" element={<UsersPage />} /><Route path="roles" element={<RolesPage />} /><Route path="classes" element={<ClassesPage />} /><Route path="courses" element={<CoursesPage />} /></Route>
      <Route path="schedules" element={<SchedulesPage />} />
      <Route element={<RoleRoute roles={['admin', 'student']} />}><Route path="attendance" element={<AttendancePage />} /></Route>
      <Route path="profile" element={<ProfilePage />} />
    </Route></Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></Suspense></BrowserRouter>;
}
