import { Navigate, Outlet } from 'react-router-dom';
import { PageLoader } from '../components/ui/PageLoader/PageLoader';
import { useAuth } from '../features/auth/use-auth';

export function ProtectedRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <PageLoader fullPage />;
  if (!user) return <Navigate to="/login" replace />;

  return <Outlet />;
}

export function RoleRoute({ roles }) {
  const { user } = useAuth();

  if (!roles.includes(user.role_name)) {
    return <Navigate to={user.role_name === 'admin' ? '/' : '/schedules'} replace />;
  }

  return <Outlet />;
}
