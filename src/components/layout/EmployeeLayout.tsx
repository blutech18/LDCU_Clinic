import { Navigate } from 'react-router-dom';
import { useAuthStore } from '~/modules/auth';
import { SidebarLayout } from './SidebarLayout';

/**
 * Persistent layout wrapper for all authenticated employee routes.
 * By rendering SidebarLayout once here (with <Outlet />), the sidebar
 * and header stay mounted as the user navigates between pages — no
 * full-page remount on every route change.
 */
export function EmployeeLayout() {
  const { profile, isAuthenticated, isInitialized, isLoading } = useAuthStore();

  if (!isInitialized || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-maroon-700"></div>
      </div>
    );
  }

  if (!isAuthenticated || !profile) {
    return <Navigate to="/login" replace />;
  }

  if (profile.role === 'student') {
    return <Navigate to="/student/booking" replace />;
  }

  if (profile.role === 'staff') {
    return <Navigate to="/staff/booking" replace />;
  }

  return <SidebarLayout />;
}
